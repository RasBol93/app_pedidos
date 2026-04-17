import type { PickupSlotOption, PickupStatus } from "@/types/webapp";

import { getBackendApiBaseUrl } from "@/lib/backend-menu";

type BackendPickupSlot = {
  value?: string;
  label?: string;
  hhmm?: string;
  is_asap?: boolean;
};

type BackendPickupSlotsResponse = {
  ok?: boolean;
  tenant_id?: string;
  message?: string;
  slots?: BackendPickupSlot[];
  pickup_interval_minutes?: number;
  open_time?: string;
  close_time?: string;
  last_order_time?: string;
};

export type BackendPickupPayload = {
  open_status: PickupStatus;
  pickup_interval_minutes?: number;
};

function normalizeSlotOption(slot: BackendPickupSlot): PickupSlotOption | null {
  if (!slot?.value) {
    return null;
  }

  return {
    value: slot.value,
    label: slot.label?.trim() || slot.value,
    hhmm: slot.hhmm || slot.value,
    is_asap: Boolean(slot.is_asap)
  };
}

export function normalizeBackendPickup(payload: BackendPickupSlotsResponse): BackendPickupPayload {
  const options = (payload.slots ?? [])
    .map(normalizeSlotOption)
    .filter((slot): slot is PickupSlotOption => Boolean(slot));

  const hoursLabel =
    payload.open_time && payload.close_time
      ? `${payload.open_time} - ${payload.close_time}`
      : "Horarios sujetos a disponibilidad";

  return {
    open_status: {
      can_place_order: options.length > 0,
      is_open_now: options.length > 0,
      closed_now: options.length === 0,
      closed_today: options.length === 0,
      message:
        payload.message?.trim() ||
        (options.length > 0
          ? "Elige una hora de recojo disponible."
          : "No hay horarios de pickup disponibles."),
      today_hours_label: hoursLabel,
      pickup_slots: options.map((slot) => slot.value),
      pickup_slot_options: options
    },
    pickup_interval_minutes: payload.pickup_interval_minutes
  };
}

export async function fetchPickupStatusFromBackend(tenantId: string) {
  const response = await fetch(
    `${getBackendApiBaseUrl()}/pickup/slots?tenant_id=${encodeURIComponent(tenantId)}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    throw new Error(payload?.detail || payload?.error || `No se pudo obtener el pickup para ${tenantId}.`);
  }

  const payload = (await response.json()) as BackendPickupSlotsResponse;

  if (!Array.isArray(payload?.slots)) {
    throw new Error("El backend devolvio un formato de pickup no valido.");
  }

  return normalizeBackendPickup(payload);
}
