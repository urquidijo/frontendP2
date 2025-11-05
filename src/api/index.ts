import axios from "axios";

import { fetchWithCache, type CacheOptions } from "../core/offlineCache";

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
  imagen_archivo?: File | null;
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

const cachedGet = <T>(key: string, url: string, ttl?: number, options?: CacheOptions) =>
  fetchWithCache<T>(key, async () => {
    const { data } = await api.get<T>(url);
    return data;
  }, ttl, options);

export const fetchProducts = async () => cachedGet<Product[]>("productos", "productos/", 1000 * 60 * 5);

export const fetchLowStockProducts = async () =>
  cachedGet<Product[]>("productos-low-stock", "productos/low-stock/", 1000 * 60 * 2);

const productPayloadToFormData = (payload: Partial<ProductPayload>) => {
  const formData = new FormData();

  if (payload.nombre !== undefined) {
    formData.append("nombre", payload.nombre);
  }
  if (payload.descripcion !== undefined) {
    formData.append("descripcion", payload.descripcion ?? "");
  }
  if (payload.precio !== undefined) {
    formData.append("precio", payload.precio);
  }
  if (payload.stock !== undefined) {
    formData.append("stock", String(payload.stock));
  }
  if (payload.low_stock_threshold !== undefined) {
    formData.append("low_stock_threshold", String(payload.low_stock_threshold ?? ""));
  }
  if (payload.categoria_id !== undefined) {
    const value = payload.categoria_id;
    formData.append("categoria_id", value === null ? "" : String(value));
  }
  if (payload.imagen_archivo) {
    formData.append("imagen_archivo", payload.imagen_archivo);
  } else if (payload.imagen !== undefined) {
    formData.append("imagen", payload.imagen ?? "");
  }

  return formData;
};

export const createProduct = async (payload: ProductPayload) => {
  const { data } = await api.post<Product>("productos/", productPayloadToFormData(payload));
  return data;
};

export const updateProduct = async (id: number, payload: Partial<ProductPayload>) => {
  const { data } = await api.patch<Product>(`productos/${id}/`, productPayloadToFormData(payload));
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
  const key = params?.activos ? "descuentos-activos" : "descuentos";
  return fetchWithCache<ProductDiscount[]>(key, async () => {
    const { data } = await api.get<ProductDiscount[]>("descuentos/", {
      params: params?.activos ? { activos: true } : undefined,
    });
    return data;
  });
};

export const fetchActiveDiscounts = async () =>
  cachedGet<ProductDiscount[]>("descuentos-activos-listado", "descuentos/activos/", 1000 * 60 * 10);

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

export const fetchCategories = async () =>
  cachedGet<Category[]>("categorias", "categorias/", 1000 * 60 * 30);

export const fetchUsers = async () =>
  cachedGet<Usuario[]>("usuarios", "usuario/", 1000 * 60 * 5);

export const fetchRoles = async () =>
  cachedGet<Rol[]>("roles", "rol/", 1000 * 60 * 30);

export const fetchRolePermissions = async () =>
  cachedGet<RolePermission[]>("roles-permisos", "rolpermiso/", 1000 * 60 * 10);

export const registerUser = async (payload: RegisterPayload) => {
  const { data } = await api.post<Usuario>("usuario/", payload);
  return data;
};

export const loginUser = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>("auth/login/", payload);
  return data;
};

export const fetchCurrentUser = async () =>
  cachedGet<Usuario>("usuario-actual", "auth/me/", 1000 * 60 * 5, { fallbackOnError: false });

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

export const fetchBitacoraEntries = async () =>
  cachedGet<BitacoraEntry[]>("bitacora", "bitacora/", 1000 * 60 * 2);

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

export const fetchInvoices = async (usuarioId: number) =>
  fetchWithCache<Invoice[]>(`facturas-usuario-${usuarioId}`, async () => {
    const { data } = await api.get<Invoice[]>(`pagos/facturas/?usuario=${usuarioId}`);
    return data;
  });

export const fetchAllInvoices = async () =>
  cachedGet<Invoice[]>("facturas", "pagos/facturas/", 1000 * 60 * 5);

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

export const fetchSalesHistory = async () =>
  cachedGet<SalesHistoryResponse>("analitica-historicas", "analitica/ventas/historicas/", 1000 * 60 * 30);

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

export const fetchSalesPredictions = async () =>
  cachedGet<SalesPredictionsResponse>("analitica-predicciones", "analitica/ventas/predicciones/", 1000 * 60 * 30);

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
