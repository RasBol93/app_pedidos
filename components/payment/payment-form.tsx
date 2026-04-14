"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCartContext } from "@/context/cart-context";
import { useOrderFlowContext } from "@/context/order-flow-context";
import { formatCurrency } from "@/lib/format";
import { buildTenantHref } from "@/lib/tenant";
import { createOrder, uploadPaymentProof } from "@/services/webapp-api";
import type { CartItem, WebappBootstrap } from "@/types/webapp";

type PaymentFormProps = {
  tenantId: string;
  bootstrap: WebappBootstrap;
  items: CartItem[];
  total: number;
};

export function PaymentForm({ tenantId, bootstrap, items, total }: PaymentFormProps) {
  const router = useRouter();
  const cart = useCartContext();
  const orderFlow = useOrderFlowContext();
  const draft = orderFlow.getDraft(tenantId);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!proofFile) {
      setPreviewUrl("");
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

      const upload = await uploadPaymentProof(proofFile);
      const orderItems = items.map((item) => ({
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const order = await createOrder({
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

      orderFlow.clearDraft(tenantId);
      cart.clearCart(tenantId);
      router.push(buildTenantHref("/confirmation", tenantId, { order_id: order.order_id }));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos registrar tu pedido. Intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="checkout-layout" onSubmit={handleSubmit}>
      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pago QR</p>
            <h2>Total a pagar</h2>
          </div>
          <strong>{formatCurrency(total, bootstrap.tenant.currency)}</strong>
        </div>

        <div className="mini-summary">
          <div>
            <span>Cliente</span>
            <strong>{draft.customer_name}</strong>
          </div>
          <div>
            <span>Telefono</span>
            <strong>{draft.customer_phone}</strong>
          </div>
          <div>
            <span>Pickup</span>
            <strong>{draft.requested_time}</strong>
          </div>
        </div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pago</p>
            <h2>Escanea el QR</h2>
          </div>
        </div>
        <p className="payment-copy">{bootstrap.payment_info.instructions}</p>
        <div className="payment-box">
          {bootstrap.payment_info.qr_image_url ? (
            <img src={bootstrap.payment_info.qr_image_url} alt="Codigo QR de pago" className="qr-image" />
          ) : null}
          {bootstrap.payment_info.reference_label && bootstrap.payment_info.reference_value ? (
            <div className="payment-reference">
              <span>{bootstrap.payment_info.reference_label}</span>
              <strong>{bootstrap.payment_info.reference_value}</strong>
            </div>
          ) : null}
        </div>

        <label className="upload-box">
          <span>Sube tu comprobante</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
          />
          <small>Formato esperado: imagen clara tomada desde el celular.</small>
        </label>

        {proofFile ? (
          <div className="preview-card">
            <div>
              <span className="preview-label">Archivo seleccionado</span>
              <strong>{proofFile.name}</strong>
            </div>
            {previewUrl ? <img src={previewUrl} alt="Preview del comprobante" className="preview-image" /> : null}
          </div>
        ) : null}

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <button type="submit" className="button button-primary button-block" disabled={isDisabled}>
          {isSubmitting ? "Enviando..." : "Ya pague"}
        </button>
      </section>
    </form>
  );
}
