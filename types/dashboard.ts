export type DashboardPeriodKey = "today" | "this_week" | "month_to_date" | (string & {});

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  label: string;
  range_text?: string;
};

export type DashboardTenant = {
  tenant_id?: string;
  restaurant_name?: string;
  name?: string;
  currency?: string;
  [key: string]: unknown;
};

export type DashboardKpis = Record<string, number | string | null | undefined>;

export type DashboardKpiComparison = {
  key?: string;
  label?: string;
  current_value?: number | string | null;
  reference_value?: number | string | null;
  delta_absolute?: number | string | null;
  delta_percent?: number | string | null;
  direction?: "up" | "down" | "flat" | string;
  sentiment?: "positive" | "negative" | "neutral" | string;
  [key: string]: unknown;
};

export type DashboardKpiComparisonMap = {
  sales_total?: DashboardKpiComparison[];
  orders_paid?: DashboardKpiComparison[];
  avg_ticket?: DashboardKpiComparison[];
  unique_customers?: DashboardKpiComparison[];
  [key: string]: DashboardKpiComparison[] | undefined;
};

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
  name: string;
  sales: number;
  orders: number;
  percent?: number;
  [key: string]: unknown;
};

export type OrderItemCountDistribution = {
  item_count: number;
  orders_count: number;
  percent: number;
  [key: string]: unknown;
};

export type TopOrderCombination = {
  products: string[];
  label: string;
  orders_count: number;
  sales?: number;
  percent: number;
  [key: string]: unknown;
};

export type CustomerOrderTypeDistribution = {
  type: "new" | "returning" | string;
  label: string;
  orders_count: number;
  percent: number;
  [key: string]: unknown;
};

export type TopRecurrentCustomer = {
  name: string;
  contact?: string;
  orders_count: number;
  total_spent: number;
  last_purchase_at?: string;
  products_text?: string;
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

export type DashboardSurveyQuestionSummary = {
  question_id?: string;
  question_key?: string;
  question?: string;
  label?: string;
  average?: number;
  total_answers?: number;
  histogram?: Record<string, number>;
  [key: string]: unknown;
};

export type SurveyTrendPoint = {
  label: string;
  start?: string;
  end?: string;
  avg: number | null;
  count: number;
  [key: string]: unknown;
};

export type SurveyQuestionTrend = {
  question_id: string;
  question_text: string;
  current_avg: number | null;
  current_count: number;
  trend: SurveyTrendPoint[];
  [key: string]: unknown;
};

export type DashboardSurveyTrends = {
  period_grain: "day" | "week" | "month" | string;
  overall: SurveyTrendPoint[];
  by_question: SurveyQuestionTrend[];
  [key: string]: unknown;
};

export type DashboardSurveySummary = {
  total_answers: number;
  total_unique_responses: number;
  general_stars_avg: number;
  general_stars_hist: Record<string, number>;
  by_question: DashboardSurveyQuestionSummary[];
};

export type DashboardMetadata = {
  generated_at?: string;
  source?: string;
  tenant_id?: string;
  [key: string]: unknown;
};

export type DashboardOrderDetailRow = {
  order_id: string;
  paid_at?: string;
  date_label: string;
  time_label: string;
  customer_name: string;
  customer_contact?: string;
  items_summary: string;
  paid_amount: number;
  currency?: string;
  [key: string]: unknown;
};

export type DashboardOrdersDetailResponse = {
  ok: boolean;
  tenant_id: string;
  period: DashboardPeriod;
  orders: DashboardOrderDetailRow[];
  total_orders: number;
  total_paid_amount: number;
  [key: string]: unknown;
};

export type DashboardSalesGoal = {
  period: "today" | "this_week" | "month_to_date" | string;
  target_amount: number | null;
  current_amount: number;
  remaining_amount: number | null;
  achievement_percent: number | null;
  status: "not_configured" | "behind" | "achieved" | string;
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
  kpi_comparisons?: DashboardKpiComparisonMap | null;
  sales_goal?: DashboardSalesGoal | null;
  sales_by_day: DashboardSeriesPoint[];
  sales_by_hour: DashboardSeriesPoint[];
  top_products: DashboardTopProduct[];
  categories: DashboardCategory[];
  order_item_count_distribution?: OrderItemCountDistribution[];
  top_order_combinations?: TopOrderCombination[];
  customer_order_type_distribution?: CustomerOrderTypeDistribution[];
  top_recurrent_customers?: TopRecurrentCustomer[];
  customers_summary: DashboardCustomersSummary | null;
  survey_summary: DashboardSurveySummary | null;
  survey_trends?: DashboardSurveyTrends | null;
  insights: DashboardInsight[];
  metadata: DashboardMetadata | null;
};
