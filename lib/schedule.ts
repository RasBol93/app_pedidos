import type { AdminSettings, PickupStatus } from "@/types/webapp";

const WEEKDAY_MAP = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

type TimeWindow = {
  open: string;
  close: string;
};

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getZonedDateParts(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.toLowerCase() ?? "monday";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    weekday,
    currentMinutes: hour * 60 + minute
  };
}

function ceilToInterval(value: number, interval: number) {
  return Math.ceil(value / interval) * interval;
}

function parseOpenDays(value: AdminSettings["weekly_open_days"]) {
  if (Array.isArray(value)) {
    return value.map((day) => day.toLowerCase());
  }

  return value
    .split(",")
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);
}

function getWindows(settings: AdminSettings) {
  const windows: TimeWindow[] = [];

  if (settings.weekly_slot1_open && settings.weekly_slot1_close) {
    windows.push({
      open: settings.weekly_slot1_open,
      close: settings.weekly_slot1_close
    });
  }

  if (
    settings.weekly_slot_mode === "split" &&
    settings.weekly_slot2_open &&
    settings.weekly_slot2_close
  ) {
    windows.push({
      open: settings.weekly_slot2_open,
      close: settings.weekly_slot2_close
    });
  }

  return windows;
}

export function buildPickupStatus(
  settings: AdminSettings,
  now = new Date(),
  timeZone = "America/La_Paz"
): PickupStatus {
  const openDays = parseOpenDays(settings.weekly_open_days);
  const zonedNow = getZonedDateParts(now, timeZone);
  const weekday = zonedNow.weekday || WEEKDAY_MAP[now.getDay()];
  const currentMinutes = zonedNow.currentMinutes;
  const prepTime = settings.prep_time_min;
  const interval =
    settings.pickup_interval_minutes || settings.interval_horarios_recog_minutos || 20;

  if (settings.today_mode === "temporary_closed") {
    return {
      can_place_order: false,
      is_open_now: false,
      closed_now: true,
      closed_today: false,
      message: settings.temp_closed_message || "Temporalmente no estamos recibiendo pedidos.",
      today_hours_label: "Cierre temporal",
      pickup_slots: []
    };
  }

  if (!openDays.includes(weekday) || settings.today_mode === "closed") {
    return {
      can_place_order: false,
      is_open_now: false,
      closed_now: true,
      closed_today: true,
      message: settings.today_closed_message || "Hoy no estamos atendiendo pedidos.",
      today_hours_label: "Cerrado hoy",
      pickup_slots: []
    };
  }

  const windows = getWindows(settings);
  const slots = windows.flatMap((window) => {
    const openMinutes = toMinutes(window.open);
    const closeMinutes = toMinutes(window.close);
    const firstAvailable = ceilToInterval(Math.max(openMinutes, currentMinutes + prepTime), interval);
    const results: string[] = [];

    for (let minute = firstAvailable; minute < closeMinutes; minute += interval) {
      results.push(formatMinutes(minute));
    }

    return results;
  });

  const hoursLabel = windows.map((window) => `${window.open} - ${window.close}`).join(" / ");

  if (slots.length === 0) {
    return {
      can_place_order: false,
      is_open_now: false,
      closed_now: true,
      closed_today: false,
      message: "Ya no hay horarios de pickup disponibles por hoy.",
      today_hours_label: hoursLabel || "Sin horarios",
      pickup_slots: []
    };
  }

  const openNow = windows.some((window) => {
    const openMinutes = toMinutes(window.open);
    const closeMinutes = toMinutes(window.close);
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  });

  return {
    can_place_order: true,
    is_open_now: openNow,
    closed_now: !openNow,
    closed_today: false,
    message: openNow
      ? "Pedidos habilitados para pickup."
      : "Todavia estamos cerrados, pero puedes elegir un horario de pickup disponible.",
    today_hours_label: hoursLabel,
    pickup_slots: slots
  };
}
