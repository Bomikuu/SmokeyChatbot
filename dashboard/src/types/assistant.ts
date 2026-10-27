export interface Membership {
  public_id: string;
  display_name: string;
  role: string;
}
export interface BusinessOwner {
  id: number;
  email: string;
  first_name: string;
  businesses: Membership[];
}
export interface Business {
  public_id: string;
  display_name: string;
  timezone: string;
  enabled_modules: string[];
}
export interface Mascot {
  mode: "smokey" | "custom" | "standard";
  asset_type?: "static" | "sprite";
  columns?: number;
  rows?: number;
  frames?: Record<string, [number, number]>;
}
export interface AssistantSettings {
  default_connection_id: string | null;
  presentation: "drawer" | "modal";
  mascot: Mascot;
  has_mascot_asset: boolean;
  permissions: string[];
  timezone: string;
  daily_requests: number;
  monthly_requests: number;
  daily_tokens: number;
  monthly_tokens: number;
}
export interface Connection {
  id: string;
  name: string;
  provider: string;
  model: string;
  permitted_models: string[];
  status: string;
  secret_suffix: string;
  credits_usd?: string | null;
  usage_by_model?: {
    provider: string;
    model: string;
    calls: number;
    input_tokens: number | null;
    output_tokens: number | null;
    unknown: number;
  }[];
}
export interface ModelCandidate {
  id: string;
  name?: string;
}
export interface GenerationPlan {
  kind: string;
  date_from: string;
  date_to: string;
}
export interface Generation {
  id?: string;
  state: string;
  prompt?: string;
  plan?: { kind?: string; date_from?: string; date_to?: string };
  report_id?: string | null;
  clarification?: string;
  error?: { message: string; code?: string } | null;
}
export type Row = Record<string, unknown>;
export interface ReportTable {
  label: string;
  total: number;
  stored?: number;
  truncated?: boolean;
  rows: Row[];
}
export interface Report {
  id: string;
  title: string;
  created_at: string;
  provider: string;
  model: string;
  actor_id: string;
  narrative: { summary: string; highlights?: string[] };
  facts: {
    kind: string;
    date_from: string;
    date_to: string;
    timezone: string;
    metrics: Record<string, unknown>;
    tables: Record<string, ReportTable>;
    sources: { href: string; label: string }[];
    unavailable_sources?: string[];
    charts?: {
      sales?: { date: string; sales: string; orders: number }[];
      payments?: { label: string; orders: number; sales: string }[];
      attendance?: { date: string; records: number }[];
    };
  };
}
export interface ReportList {
  count: number;
  results: Pick<Report, "id" | "title" | "created_at" | "model">[];
}
export interface Usage {
  by_model: {
    connection_id_snapshot: string;
    provider: string;
    model: string;
    calls: number;
    input_tokens: number | null;
    output_tokens: number | null;
    unknown: number;
  }[];
  limits_usage: { period: string; requests: number; tokens: number }[];
  attempts: {
    provider: string;
    model: string;
    purpose: string;
    outcome: string;
    input_tokens: number | null;
    output_tokens: number | null;
    generation_state: string | null;
    created_at: string;
  }[];
}
