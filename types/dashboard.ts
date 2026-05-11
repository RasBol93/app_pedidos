export type DashboardPeriod = "today" | "this_week" | "month_to_date" | (string & {});

export type DashboardTenant = {
  tenant_id?: string;
  restaurant_name?: string;
  name?: string;
  currency?: string;
  [key: string]: unknown;
};

export type DashboardKpis = Record<string, number | string | null | undefined>;

export type DashboardSeriesPoint = {
  label?: string;
  date?: string;
  day?: string;
  hour?: string;
  time?: string;
  value?: number | string;
  sales?: number | string;
  total?: number | string;
  revenue?: number | string;
  amount?: number | string;
  count?: number | string;
  orders?: number | string;
  [key: string]: unknown;
};

export type DashboardTopProduct = {
  sku?: string;
  name?: string;
  product_name?: string;
  title?: string;
  revenue?: number | string;
  sales?: number | string;
  total?: number | string;
  amount?: number | string;
  quantity?: number | string;
  units?: number | string;
  count?: number | string;
  orders?: number | string;
  [key: string]: unknown;
};

export type DashboardCategory = {
  name?: string;
  category?: string;
  label?: string;
  revenue?: number | string;
  sales?: number | string;
  total?: number | string;
  amount?: number | string;
  quantity?: number | string;
  units?: number | string;
  count?: number | string;
  orders?: number | string;
  [key: string]: unknown;
};

export type DashboardTopCustomer = {
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  total?: number | string;
  total_spent?: number | string;
  revenue?: number | string;
  orders?: number | string;
  count?: number | string;
  [key: string]: unknown;
};

export type DashboardCustomersSummary = {
  total_customers?: number | string;
  unique_customers?: number | string;
  repeat_customers?: number | string;
  returning_customers?: number | string;
  top_customers?: DashboardTopCustomer[];
  customers?: DashboardTopCustomer[];
  [key: string]: unknown;
};

export type DashboardSurveySummary = {
  average_rating?: number | string;
  avg_rating?: number | string;
  total_responses?: number | string;
  responses?: number | string;
  rating_counts?: Record<string, number | string>;
  histogram?: Record<string, number | string>;
  [key: string]: unknown;
};

export type DashboardMetadata = {
  generated_at?: string;
  generated_at_iso?: string;
  timezone?: string;
  currency?: string;
  [key: string]: unknown;
};

export type DashboardInsight =
  | string
  | {
      title?: string;
      message?: string;
      body?: string;
      [key: string]: unknown;
    };

export type DashboardSummaryResponse = {
  ok: boolean;
  tenant: DashboardTenant | string;
  period: DashboardPeriod;
  kpis: DashboardKpis;
  sales_by_day: DashboardSeriesPoint[];
  sales_by_hour: DashboardSeriesPoint[];
  top_products: DashboardTopProduct[];
  categories: DashboardCategory[];
  customers_summary: DashboardCustomersSummary | null;
  survey_summary: DashboardSurveySummary | null;
  insights: DashboardInsight[];
  metadata: DashboardMetadata | null;
};
