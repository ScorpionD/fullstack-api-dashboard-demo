export type Role = "admin" | "user";
export type View =
  "overview" | "customers" | "orders" | "integrations" | "audit" | "debugging";
export interface Session {
  user: { id: string; name: string; email: string; role: Role };
  csrfToken: string;
  workspaceId: string;
}
export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "active" | "inactive";
  createdAt: string;
}
export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  company: string;
  reference: string;
  description: string;
  amountCents: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  createdAt: string;
}
export interface Meta {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
}
export interface List<T> {
  data: T[];
  meta: Meta;
}
export interface Overview {
  customers: number;
  orders: number;
  revenueCents: number;
  openOrders: number;
  statuses: { status: string; count: number }[];
  trend: { label: string; totalCents: number }[];
  recentOrders: Order[];
}
export interface Rates {
  base: string;
  date: string | null;
  rates: { USD: number; GBP: number } | null;
  fetchedAt: string | null;
  status: "live" | "cached" | "fallback" | "unavailable";
  scenario: string;
  reason?: string;
  processingMs: number;
  source: string;
}
export interface Audit {
  id: string;
  action: string;
  entity: string;
  summary: string;
  created_at: string;
  actor: string;
}
