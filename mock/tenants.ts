import { buildPickupStatus } from "@/lib/schedule";
import type { WebappBootstrap } from "@/types/webapp";

type MockTenantDatabase = Omit<WebappBootstrap, "open_status">;

const baseFaq = [
  "Como pago? Solo por QR o transferencia antes de confirmar el pedido.",
  "Hacen delivery? No, por ahora solo pickup.",
  "Cuando confirman mi pedido? Despues de revisar tu comprobante de pago."
].join("\n\n");

const database: Record<string, MockTenantDatabase> = {
  resto_demo: {
    tenant: {
      tenant_id: "resto_demo",
      restaurant_name: "Brasa Norte",
      logo_url: "/images/logo-burger.svg",
      cover_image_url: "/images/cover-warm.svg",
      timezone: "America/La_Paz",
      currency: "BOB",
      branding: {
        primaryColor: "#b43a20",
        accentColor: "#ff9b5e",
        surfaceColor: "#fff7f1"
      }
    },
    content: [
      { key: "restaurant_name", value: "Brasa Norte", active: true },
      {
        key: "welcome_text",
        value: "Hamburguesas hechas al momento, postres simples y pickup rapido.",
        active: true
      },
      {
        key: "location_text",
        value: "Av. San Martin 812, Equipetrol, Santa Cruz",
        active: true
      },
      {
        key: "location_link",
        value: "https://maps.google.com/?q=Av.+San+Martin+812+Santa+Cruz",
        active: true
      },
      { key: "faq_text", value: baseFaq, active: true },
      { key: "survey_text", value: "", active: false }
    ],
    menu: [
      {
        sku: "BRG-001",
        name: "Classic Norte",
        price: 36,
        active: true,
        category: "Hamburguesas",
        photo_url: "/images/item-burger.svg",
        description: "Pan brioche, carne smash, cheddar y salsa de la casa."
      },
      {
        sku: "BRG-002",
        name: "Doble Brasa",
        price: 45,
        active: true,
        category: "Hamburguesas",
        photo_url: "/images/item-burger.svg",
        description: "Doble carne, pepinillos, cebolla crispy y cheddar."
      },
      {
        sku: "BRG-003",
        name: "Cheese Melt",
        price: 41,
        active: true,
        category: "Hamburguesas",
        photo_url: "/images/item-burger.svg"
      },
      {
        sku: "DRK-001",
        name: "Limonada de la casa",
        price: 12,
        active: true,
        category: "Bebidas",
        photo_url: "/images/item-drink.svg"
      },
      {
        sku: "DRK-002",
        name: "Refresco lata",
        price: 9,
        active: true,
        category: "Bebidas",
        photo_url: "/images/item-drink.svg"
      },
      {
        sku: "DST-001",
        name: "Brownie tibio",
        price: 18,
        active: true,
        category: "Postres",
        photo_url: "/images/item-dessert.svg"
      },
      {
        sku: "SID-001",
        name: "Papas rusticas",
        price: 16,
        active: true,
        category: "Acompanamientos",
        photo_url: "/images/item-side.svg"
      },
      {
        sku: "SID-002",
        name: "Aros de cebolla",
        price: 15,
        active: false,
        category: "Acompanamientos",
        photo_url: "/images/item-side.svg"
      }
    ],
    admin_settings: {
      weekly_open_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      weekly_slot_mode: "split",
      weekly_slot1_open: "12:00",
      weekly_slot1_close: "15:30",
      weekly_slot2_open: "18:30",
      weekly_slot2_close: "22:00",
      today_mode: "regular",
      prep_time_min: 20,
      interval_horarios_recog_minutos: 20,
      maximo_pedidos_por_horario: 20,
      pickup_interval_minutes: 20
    },
    payment_info: {
      instructions:
        "Escanea el QR o realiza la transferencia. Sube el comprobante antes de tocar 'Ya pague'.",
      qr_image_url: "/images/qr-orange.svg",
      reference_label: "Alias de transferencia",
      reference_value: "brasanorte.bo"
    }
  },
  cafe_centro: {
    tenant: {
      tenant_id: "cafe_centro",
      restaurant_name: "Cafe Centro",
      logo_url: "/images/logo-cafe.svg",
      cover_image_url: "/images/cover-green.svg",
      timezone: "America/La_Paz",
      currency: "BOB",
      branding: {
        primaryColor: "#24513d",
        accentColor: "#a0d9b3",
        surfaceColor: "#f4fbf6"
      }
    },
    content: [
      { key: "restaurant_name", value: "Cafe Centro", active: true },
      {
        key: "welcome_text",
        value: "Cafe, sandwiches y postres listos para recoger sin esperar demasiado.",
        active: true
      },
      {
        key: "location_text",
        value: "Calle Libertad 455, Centro, Cochabamba",
        active: true
      },
      {
        key: "location_link",
        value: "https://maps.google.com/?q=Calle+Libertad+455+Cochabamba",
        active: true
      },
      { key: "faq_text", value: baseFaq, active: true },
      { key: "survey_text", value: "", active: false }
    ],
    menu: [
      {
        sku: "SND-001",
        name: "Sandwich melt",
        price: 27,
        active: true,
        category: "Hamburguesas",
        photo_url: "/images/item-burger.svg",
        description: "Pan ciabatta, queso, jamon y tomate asado."
      },
      {
        sku: "DRK-101",
        name: "Cold brew",
        price: 18,
        active: true,
        category: "Bebidas",
        photo_url: "/images/item-drink.svg"
      },
      {
        sku: "DST-101",
        name: "Cheesecake de maracuya",
        price: 20,
        active: true,
        category: "Postres",
        photo_url: "/images/item-dessert.svg"
      },
      {
        sku: "SID-101",
        name: "Croissant de mantequilla",
        price: 14,
        active: true,
        category: "Acompanamientos",
        photo_url: "/images/item-side.svg"
      }
    ],
    admin_settings: {
      weekly_open_days: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ],
      weekly_slot_mode: "single",
      weekly_slot1_open: "08:00",
      weekly_slot1_close: "20:00",
      today_mode: "regular",
      prep_time_min: 15,
      interval_horarios_recog_minutos: 15,
      maximo_pedidos_por_horario: 15,
      pickup_interval_minutes: 15
    },
    payment_info: {
      instructions:
        "Haz el pago por QR y sube una foto legible del comprobante para que podamos validarlo.",
      qr_image_url: "/images/qr-green.svg",
      reference_label: "Cuenta",
      reference_value: "CAFE-CENTRO-9821"
    }
  }
};

export async function getBootstrapByTenantId(tenantId: string) {
  const record = database[tenantId];

  if (!record) {
    return null;
  }

  return {
    ...record,
    open_status: buildPickupStatus(record.admin_settings, new Date(), record.tenant.timezone)
  } satisfies WebappBootstrap;
}

export function listMockTenants() {
  return Object.keys(database);
}
