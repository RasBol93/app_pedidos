"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCartContext } from "@/context/cart-context";
import { useOrderFlowContext } from "@/context/order-flow-context";
import { formatCurrency } from "@/lib/format";
import { buildTenantHref } from "@/lib/tenant";
import { createOrder, reportPaymentProof, uploadPaymentProof } from "@/services/webapp-api";
import type {
  CartItem,
  CreateOrderItemInput,
  CreateOrderResponse,
  UploadPaymentProofResponse,
  WebappBootstrap
} from "@/types/webapp";

type PaymentFormProps = {
  tenantId: string;
  bootstrap: WebappBootstrap;
  items: CartItem[];
  total: number;
};

const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.8;

function isOptimizableImage(file: File) {
  return OPTIMIZABLE_IMAGE_TYPES.has(file.type.toLowerCase());
}

function buildOptimizedFileName(originalName: string) {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  return `${baseName || "payment-proof"}.jpg`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No pudimos leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function optimizePaymentProofFile(file: File) {
  if (!isOptimizableImage(file)) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const longestSide = Math.max(image.width, image.height);

    if (longestSide <= MAX_IMAGE_SIDE) {
      return file;
    }

    const scale = MAX_IMAGE_SIDE / longestSide;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const optimizedBlob = await canvasToBlob(canvas, JPEG_QUALITY);

    if (!optimizedBlob || optimizedBlob.size === 0 || optimizedBlob.size >= file.size) {
      return file;
    }

    return new File([optimizedBlob], buildOptimizedFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified
    });
  } catch {
    return file;
  }
}

export function PaymentForm({ tenantId, bootstrap, items, total }: PaymentFormProps) {
  const router = useRouter();
  const cart = useCartContext();
  const orderFlow = useOrderFlowContext();
  const draft = orderFlow.getDraft(tenantId);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedProof, setUploadedProof] = useState<UploadPaymentProofResponse | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreateOrderResponse | null>(null);

  useEffect(() => {
    if (!proofFile) {
      setPreviewUrl("");
      setUploadedProof(null);
      setCreatedOrder(null);
      return;
    }

    const nextPreview = URL.createObjectURL(proofFile);
    setPreviewUrl(nextPreview);

    return () => {
      URL.revokeObjectURL(nextPreview);
    };
  }, [proofFile]);

  const isDisabled = useMemo(() => {
    return (
      isSubmitting ||
      !bootstrap.open_status.can_place_order ||
      items.length === 0 ||
      !proofFile ||
      !draft.customer_name.trim() ||
      !draft.customer_phone.trim() ||
      !draft.requested_time
    );
  }, [
    bootstrap.open_status.can_place_order,
    draft.customer_name,
    draft.customer_phone,
    draft.requested_time,
    isSubmitting,
    items.length,
    proofFile
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDisabled || !proofFile) {
      setError("Completa tus datos en el carrito y sube el comprobante de pago.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const orderItems = items.map((item) => ({
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })) satisfies CreateOrderItemInput[];

      let upload = uploadedProof;

      if (!upload) {
        const fileForUpload = await optimizePaymentProofFile(proofFile);
        upload = await uploadPaymentProof(fileForUpload);
        setUploadedProof(upload);
      }

      let order = createdOrder;

      if (!order) {
        order = await createOrder({
          tenant_id: tenantId,
          customer_name: draft.customer_name.trim(),
          customer_phone: draft.customer_phone.trim(),
          requested_time: draft.requested_time,
          items: orderItems,
          items_snapshot: orderItems,
          total_amount: total,
          notes: draft.notes.trim(),
          payment_proof_file: upload.file_reference,
          source: "webapp",
          delivery_type: "pickup",
          status: "pending_payment_review"
        });
        setCreatedOrder(order);
      }

      await reportPaymentProof({
        tenant_id: tenantId,
        order_id: order.order_id,
        proof_type: "external_url",
        proof_reference: upload.file_reference,
        proof_caption: proofFile.name
      });

      orderFlow.setConfirmation(tenantId, {
        order_id: order.order_id,
        tenant_id: tenantId,
        customer_name: draft.customer_name.trim(),
        customer_phone: draft.customer_phone.trim(),
        requested_time: draft.requested_time,
        notes: draft.notes.trim(),
        items: orderItems,
        total_amount: total,
        status: "pending_payment_review",
        payment_proof_file: upload.file_reference,
        payment_proof_name: proofFile.name,
        created_at: new Date().toISOString()
      });

      setUploadedProof(null);
      setCreatedOrder(null);
      orderFlow.clearDraft(tenantId);
      cart.clearCart(tenantId);
      router.push(buildTenantHref("/confirmation", tenantId, { order_id: order.order_id }));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos registrar tu comprobante. Intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="payment-flow" onSubmit={handleSubmit}>
      <section className="form-card payment-hero-card">
        <p className="eyebrow">Pago QR</p>
        <h2 className="payment-title">Paga este pedido</h2>
        <p className="payment-kicker">Escanea este QR con tu app bancaria y paga el monto exacto.</p>
        <div className="payment-total-block">
          <span className="payment-total-label">Total a pagar</span>
          <strong className="payment-total-amount">
            {formatCurrency(total, bootstrap.tenant.currency)}
          </strong>
        </div>
        <p className="payment-meta-line">Pickup: {draft.requested_time}</p>
      </section>

      <section className="form-card payment-qr-card">
        <div className="payment-qr-box">
          {bootstrap.payment_info.qr_image_url ? (
            <img src={bootstrap.payment_info.qr_image_url} alt="Codigo QR de pago" className="qr-image" />
          ) : null}
        </div>
        <div className="payment-divider" />
        {bootstrap.payment_info.reference_label && bootstrap.payment_info.reference_value ? (
          <div className="payment-reference payment-reference-centered">
            <span>{bootstrap.payment_info.reference_label}</span>
            <strong>{bootstrap.payment_info.reference_value}</strong>
          </div>
        ) : null}
        <p className="payment-help-text">
          Cuando termines el pago, sube una foto clara del comprobante para continuar.
        </p>
      </section>

      <section className="form-card payment-proof-card">
        <div className="section-heading payment-proof-heading">
          <div>
            <p className="eyebrow">Comprobante</p>
            <h2>Sube tu comprobante</h2>
          </div>
        </div>
        <label className="upload-box payment-upload-box">
          <span>Selecciona una imagen desde tu celular</span>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf"
            onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
          />
          <small>Debe verse claro y completo.</small>
        </label>

        {proofFile ? (
          <div className="preview-card payment-preview-card">
            <div>
              <span className="preview-label">Archivo seleccionado</span>
              <strong>{proofFile.name}</strong>
            </div>
            {previewUrl && proofFile.type.startsWith("image/") ? (
              <img src={previewUrl} alt="Preview del comprobante" className="preview-image" />
            ) : null}
          </div>
        ) : null}

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <button
          type="submit"
          className="button button-primary button-block payment-submit-button"
          disabled={isDisabled}
        >
          {isSubmitting ? "Enviando comprobante..." : "Enviar comprobante"}
        </button>
      </section>
    </form>
  );
}
