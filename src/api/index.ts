import axios from "axios";

const apiBase =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000/api/";

export const api = axios.create({
  baseURL: apiBase.endsWith("/") ? apiBase : `${apiBase}/`,
});

export const setApiAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export interface Category {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

export interface DiscountSummary {
  id: number;
  porcentaje: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  precio_original: string;
  precio_con_descuento: string;
  esta_activo: boolean;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: string;
  stock: number;
  low_stock_threshold: number;
  categoria: Category | null;
  imagen?: string | null;
  active_discount?: DiscountSummary | null;
}

export interface ProductPayload {
  nombre: string;
  descripcion?: string;
  precio: string;
  stock: number;
  low_stock_threshold?: number;
  categoria_id?: number | null;
  imagen?: string | null;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  rol: number | null;
  rol_nombre?: string | null;
  permisos: string[];
}

export interface Rol {
  id: number;
  nombre: string;
}

export interface RolePermission {
  id: number;
  rol: number;
  permiso: number;
  rol_nombre: string;
  permiso_nombre: string;
}

export interface AdminUserPayload {
  username?: string;
  email?: string;
  password?: string;
  rol?: number | null;
}

export interface AdminUserCreatePayload {
  username: string;
  email: string;
  password: string;
  rol?: number | null;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Usuario;
}

export const fetchProducts = async () => {
  const { data } = await api.get<Product[]>("productos/");
  return data;
};

export const fetchLowStockProducts = async () => {
  const { data } = await api.get<Product[]>("productos/low-stock/");
  return data;
};

export const createProduct = async (payload: ProductPayload) => {
  const { data } = await api.post<Product>("productos/", payload);
  return data;
};

export const updateProduct = async (id: number, payload: Partial<ProductPayload>) => {
  const { data } = await api.patch<Product>(`productos/${id}/`, payload);
  return data;
};

export const deleteProduct = async (id: number) => {
  await api.delete(`productos/${id}/`);
};

export interface ProductDiscount extends DiscountSummary {
  producto: Omit<Product, "active_discount">;
}

export interface DiscountPayload {
  porcentaje: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  producto_id?: number;
  productos?: number[];
}

export const fetchDiscounts = async (params?: { activos?: boolean }) => {
  const { data } = await api.get<ProductDiscount[]>("descuentos/", {
    params: params?.activos ? { activos: true } : undefined,
  });
  return data;
};

export const fetchActiveDiscounts = async () => {
  const { data } = await api.get<ProductDiscount[]>("descuentos/activos/");
  return data;
};

export const createDiscounts = async (payload: DiscountPayload) => {
  const { data } = await api.post("descuentos/", payload);
  return data as { creados: ProductDiscount[]; errores: unknown[] } | ProductDiscount;
};

export const updateDiscount = async (id: number, payload: Partial<DiscountPayload>) => {
  const { data } = await api.patch<ProductDiscount>(`descuentos/${id}/`, payload);
  return data;
};

export const deleteDiscount = async (id: number) => {
  await api.delete(`descuentos/${id}/`);
};

export interface CartDetail {
  id: number;
  cantidad: number;
  subtotal: string;
  producto: Product;
}

export interface CartResponse {
  id: number;
  total: string;
  estado: string;
  actualizado_en: string;
  expires_at: string;
  detalles: CartDetail[];
}

export interface CartSyncPayload {
  items: CheckoutItemPayload[];
}

export const fetchCurrentCart = async () => {
  const { data } = await api.get<CartResponse>("carritos/actual/");
  return data;
};

export const syncCart = async (payload: CartSyncPayload) => {
  const { data } = await api.post<CartResponse>("carritos/actual/", payload);
  return data;
};

export const fetchCategories = async () => {
  const { data } = await api.get<Category[]>("categorias/");
  return data;
};

export const fetchUsers = async () => {
  const { data } = await api.get<Usuario[]>("usuario/");
  return data;
};

export const fetchRoles = async () => {
  const { data } = await api.get<Rol[]>("rol/");
  return data;
};

export const fetchRolePermissions = async () => {
  const { data } = await api.get<RolePermission[]>("rolpermiso/");
  return data;
};

export const registerUser = async (payload: RegisterPayload) => {
  const { data } = await api.post<Usuario>("usuario/", payload);
  return data;
};

export const loginUser = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>("auth/login/", payload);
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get<Usuario>("auth/me/");
  return data;
};

export const adminCreateUser = async (payload: AdminUserCreatePayload) => {
  const { data } = await api.post<Usuario>("usuario/", payload);
  return data;
};

export const adminUpdateUser = async (id: number, payload: AdminUserPayload) => {
  const { data } = await api.patch<Usuario>(`usuario/${id}/`, payload);
  return data;
};

export const adminDeleteUser = async (id: number) => {
  await api.delete(`usuario/${id}/`);
};

export interface BitacoraEntry {
  id: number;
  usuario: number | null;
  usuario_username?: string | null;
  accion: string;
  ip_address?: string | null;
  creado_en: string;
}

export const fetchBitacoraEntries = async () => {
  const { data } = await api.get<BitacoraEntry[]>("bitacora/");
  return data;
};

export const logoutUser = async () => {
  await api.post("auth/logout/");
};

export interface CheckoutItemPayload {
  productId: number;
  quantity: number;
}

export interface CheckoutPayload {
  usuarioId: number;
  items: CheckoutItemPayload[];
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export const createCheckoutSession = async (payload: CheckoutPayload) => {
  const { data } = await api.post<CheckoutSessionResponse>("pagos/checkout/", payload);
  return data;
};

export interface Invoice {
  id: number;
  usuario?: number | null;
  stripe_invoice_id: string;
  stripe_session_id: string;
  amount_total: string;
  currency: string;
  status: string;
  hosted_invoice_url?: string | null;
  created_at: string;
}

export const fetchInvoices = async (usuarioId: number) => {
  const { data } = await api.get<Invoice[]>(`pagos/facturas/?usuario=${usuarioId}`);
  return data;
};

export const fetchAllInvoices = async () => {
  const { data } = await api.get<Invoice[]>("pagos/facturas/");
  return data;
};

export type ReportFormat = "screen" | "pdf" | "excel";

export interface ReportPromptPayload {
  prompt: string;
  format?: ReportFormat;
  channel?: "texto" | "voz";
}

export interface ReportSummaryRow {
  label: string;
  monto_total: number;
  cantidad: number;
}

export interface ReportRow {
  factura: string;
  cliente: string;
  producto: string;
  cantidad: number;
  monto_total: number;
  fecha: string;
}

export interface ReportScreenResponse {
  metadata: {
    group_by: string;
    start_date: string | null;
    end_date: string | null;
    format: ReportFormat;
    prompt: string;
  };
  summary: ReportSummaryRow[];
  rows: ReportRow[];
}

export type ReportResponse =
  | ReportScreenResponse
  | {
      file: Blob;
      filename: string;
    };

export const generateReport = async (payload: ReportPromptPayload): Promise<ReportResponse> => {
  const format = payload.format ?? "screen";

  if (format === "screen") {
    const { data } = await api.post<ReportScreenResponse>("analitica/reportes/", payload);
    return data;
  }

  const response = await api.post<Blob>("analitica/reportes/", payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filenameMatch = disposition?.match(/filename="?(.+)"?/i);
  const fallback = format === "pdf" ? "reporte.pdf" : "reporte.xlsx";
  return {
    file: response.data,
    filename: filenameMatch?.[1] ?? fallback,
  };
};

export interface SalesPoint {
  label: string;
  total: number;
}

export interface SalesHistoryResponse {
  monthly_totals: SalesPoint[];
  by_product: SalesPoint[];
  by_customer: SalesPoint[];
  by_category: SalesPoint[];
}

export const fetchSalesHistory = async () => {
  const { data } = await api.get<SalesHistoryResponse>("analitica/ventas/historicas/");
  return data;
};

export interface CategoryForecast {
  category: string;
  share: number;
  historical: SalesPoint[];
  predictions: SalesPoint[];
}

export interface SalesPredictionsResponse {
  predictions: SalesPoint[];
  by_category: CategoryForecast[];
  metadata: {
    trained_at?: string;
    generated_at?: string;
    samples?: number;
    invoice_count?: number;
    product_count?: number;
    category_count?: number;
    period_from?: string | null;
    period_to?: string | null;
  };
}

export const fetchSalesPredictions = async () => {
  const { data } = await api.get<SalesPredictionsResponse>("analitica/ventas/predicciones/");
  return data;
};

export interface SalesModelMetadata {
  trained_at?: string;
  samples?: number;
}

export const retrainSalesModel = async () => {
  const { data } = await api.post<SalesModelMetadata>("analitica/modelo/entrenar/");
  return data;
};

export const getProductEffectivePrice = (product: Product) => {
  const basePrice = Number(product.precio);
  const discount = product.active_discount;
  if (!discount || !discount.esta_activo) {
    return basePrice;
  }
  const discounted = Number(discount.precio_con_descuento ?? basePrice);
  return Number.isNaN(discounted) ? basePrice : discounted;
};
