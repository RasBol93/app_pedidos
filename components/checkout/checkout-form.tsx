"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCartContext } from "@/context/cart-context";
import { formatCurrency } from "@/lib/format";
import { buildTenantHref } from "@/lib/tenant";
import { createOrder, uploadPaymentProof } from "@/services/webapp-api";
import type { CartItem, WebappBootstrap } from "@/types/webapp";

type CheckoutFormProps = {
  tenantId: string;
  bootstrap: WebappBootstrap;
  items: CartItem[];
  total: number;
};

export function CheckoutForm({ tenantId, bootstrap, items, total }: CheckoutFormProps) {
  const router = useRouter();
  const cart = useCartContext();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestedTime, setRequestedTime] = useState(bootstrap.open_status.pickup_slots[0] ?? "");
  const [notes, setNotes] = useState("");
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
      !customerName.trim() ||
      !customerPhone.trim() ||
      !requestedTime
    );
  }, [
    bootstrap.open_status.can_place_order,
    customerName,
    customerPhone,
    isSubmitting,
    items.length,
    proofFile,
    requestedTime
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDisabled || !proofFile) {
      setError("Completa los datos requeridos y sube el comprobante de pago.");
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
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        requested_time: requestedTime,
        items: orderItems,
        items_snapshot: orderItems,
        total_amount: total,
        notes: notes.trim(),
        payment_proof_file: upload.file_reference,
        source: "webapp",
        delivery_type: "pickup",
        status: "pending_payment_review"
      });

      cart.clearCart(tenantId);
      router.push(buildTenantHref("/order-status", tenantId, { order_id: order.order_id }));
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
            <p className="eyebrow">Checkout</p>
            <h2>Datos de pickup</h2>
          </div>
        </div>

        {!bootstrap.open_status.can_place_order ? (
          <div className="alert alert-danger">{bootstrap.open_status.message}</div>
        ) : (
          <div className="alert alert-success">
            {bootstrap.open_status.message} Horario de hoy: {bootstrap.open_status.today_hours_label}
          </div>
        )}

        <label className="field">
          <span>Nombre</span>
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </label>

        <label className="field">
          <span>Telefono</span>
          <input
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Hora de pickup</span>
          <select
            value={requestedTime}
            onChange={(event) => setRequestedTime(event.target.value)}
            disabled={!bootstrap.open_status.can_place_order}
          >
            {bootstrap.open_status.pickup_slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Notas para cocina (opcional)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </label>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pago</p>
            <h2>QR o transferencia</h2>
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
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Resumen final</p>
            <h2>Total a pagar</h2>
          </div>
          <strong>{formatCurrency(total, bootstrap.tenant.currency)}</strong>
        </div>

        <div className="mini-summary">
          {items.map((item) => (
            <div key={item.sku}>
              <span>
                {item.quantity} x {item.name}
              </span>
              <strong>{formatCurrency(item.price * item.quantity, bootstrap.tenant.currency)}</strong>
            </div>
          ))}
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <button type="submit" className="button button-primary button-block" disabled={isDisabled}>
          {isSubmitting ? "Enviando..." : "Ya pague"}
        </button>
      </section>
    </form>
  );
}
