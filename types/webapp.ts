export type TenantBranding = {
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
};

export type TenantInfo = {
  tenant_id: string;
  restaurant_name: string;
  logo_url?: string;
  cover_image_url?: string;
  timezone: string;
  currency: string;
  branding?: TenantBranding;
};

export type ContentBlock = {
  key:
    | "restaurant_name"
    | "welcome_text"
    | "location_text"
    | "location_link"
    | "faq_text"
    | "survey_text";
  value: string;
  active: boolean;
};

export type MenuCategory =
  | "Hamburguesas"
  | "Bebidas"
  | "Postres"
  | "Acompanamientos"
  | string;

export type MenuItem = {
  sku: string;
  name: string;
  price: number;
  active: boolean;
  category: MenuCategory;
  photo_url?: string;
  description?: string;
};

export type AdminSettings = {
  weekly_open_days: string[] | string;
  weekly_slot_mode: "single" | "split";
  weekly_slot1_open?: string;
  weekly_slot1_close?: string;
  weekly_slot2_open?: string;
  weekly_slot2_close?: string;
  today_mode?: "regular" | "closed" | "temporary_closed" | "special_hours";
  today_date?: string;
  today_closed_message?: string;
  temp_closed_message?: string;
  prep_time_min: number;
  interval_horarios_recog_minutos?: number;
  maximo_pedidos_por_horario?: number;
  pickup_interval_minutes: number;
};

export type PaymentInfo = {
  instructions: string;
  qr_image_url?: string;
  reference_label?: string;
  reference_value?: string;
};

export type PickupSlotOption = {
  value: string;
  label: string;
  hhmm?: string;
  is_asap?: boolean;
};

export type PickupStatus = {
  can_place_order: boolean;
  is_open_now: boolean;
  closed_now: boolean;
  closed_today: boolean;
  message?: string;
  today_hours_label: string;
  pickup_slots: string[];
  pickup_slot_options?: PickupSlotOption[];
};

export type WebappBootstrap = {
  tenant: TenantInfo;
  content: ContentBlock[];
  menu: MenuItem[];
  admin_settings: AdminSettings;
  payment_info: PaymentInfo;
  open_status: PickupStatus;
};

export type CartItem = {
  sku: string;
  name: string;
  price: number;
  photo_url?: string;
  category: string;
  quantity: number;
};

export type CreateOrderItemInput = {
  sku: string;
  name: string;
  price: number;
  quantity: number;
};

export type CreateOrderPayload = {
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  requested_time: string;
  items: CreateOrderItemInput[];
  items_snapshot?: CreateOrderItemInput[];
  total_amount: number;
  notes?: string;
  payment_proof_file?: string;
  source: "webapp";
  delivery_type: "pickup";
  status?: "pending_payment_review";
};

export type CreateOrderResponse = {
  success: boolean;
  order_id: string;
  status: "pending_payment_review";
  message: string;
};

export type UploadPaymentProofResponse = {
  success: boolean;
  file_reference: string;
  original_name: string;
};

export type ReportPaymentProofPayload = {
  tenant_id: string;
  order_id: string;
  proof_type: "external_url";
  proof_reference: string;
  proof_caption?: string;
};

export type ReportPaidPayload = {
  tenant_id: string;
  order_id: string;
};

export type BackendActionResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  [key: string]: unknown;
};

export type CheckoutDraft = {
  customer_name: string;
  customer_phone: string;
  requested_time: string;
  notes: string;
};

export type SubmittedOrderRecap = {
  order_id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  requested_time: string;
  notes?: string;
  items: CreateOrderItemInput[];
  total_amount: number;
  status: "pending_payment_review";
  payment_proof_file?: string;
  payment_proof_name?: string;
  created_at: string;
};
