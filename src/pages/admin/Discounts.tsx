import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDiscounts,
  deleteDiscount,
  fetchDiscounts,
  fetchProducts,
  type DiscountPayload,
  type ProductDiscount,
  updateDiscount,
} from "../../api";
import { currencyFormatter } from "./shared";

/* ===================== Zona horaria Bolivia ===================== */
/** IANA TZ para Bolivia (UTC-4, sin DST). */
const LA_PAZ_TZ = "America/La_Paz";
/** Offset fijo en horas respecto a UTC. */
const LA_PAZ_OFFSET_H = 4;

/** Pad de 2 dígitos */
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Convierte un string ISO (UTC) a 'YYYY-MM-DDTHH:MM' interpretado en hora de La Paz.
 * Útil para setear el value de inputs datetime-local.
 */
function isoToLaPazLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return "";
  // Pasar de UTC -> La Paz (restar 4 horas)
  const msLaPaz = utc.getTime() - LA_PAZ_OFFSET_H * 60 * 60 * 1000;
  const d = new Date(msLaPaz);
  // Tomar partes en UTC para evitar la TZ del navegador
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const H = pad2(d.getUTCHours());
  const MM = pad2(d.getUTCMinutes());
  return `${y}-${m}-${day}T${H}:${MM}`;
}

/**
 * Convierte 'YYYY-MM-DDTHH:MM' (interpretado en La Paz) a ISO (UTC).
 * Útil antes de enviar al backend.
 */
function laPazLocalToISO(local: string | null | undefined): string | null {
  if (!local) return null;
  const [date, time] = local.split("T");
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if ([y, m, d, hh, mm].some((x) => Number.isNaN(x))) return null;
  // Local (La Paz) -> UTC: sumar 4h
  const msUTC = Date.UTC(y, (m as number) - 1, d, hh + LA_PAZ_OFFSET_H, mm, 0, 0);
  return new Date(msUTC).toISOString();
}

/** Ahora mismo en La Paz como 'YYYY-MM-DDTHH:MM' para datetime-local */
function nowLaPazLocal(): string {
  const nowUTC = Date.now();
  const msLaPaz = nowUTC - LA_PAZ_OFFSET_H * 60 * 60 * 1000; // UTC -> La Paz
  const d = new Date(msLaPaz);
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());// robusto
  const HH = pad2(d.getUTCHours());
  const MM = pad2(d.getUTCMinutes());
  return `${y}-${m}-${day}T${HH}:${MM}`;
}

/** Suma días tomando como base la fecha/hora local de La Paz (mantiene hora-minuto). */
function addDaysLocalLaPaz(baseLocal: string, days: number): string {
  const iso = laPazLocalToISO(baseLocal);
  if (!iso) return baseLocal;
  const d = new Date(iso); // esto está en UTC
  d.setUTCDate(d.getUTCDate() + days); // sumar días en UTC mantiene hora/minuto
  return isoToLaPazLocal(d.toISOString());
}

/* ===================== Utils UI ===================== */
const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const defaultFormState = {
  selectedProducts: [] as number[],
  porcentaje: "",
  /** Estos strings SIEMPRE representan hora local de La Paz para los inputs */
  fecha_inicio: "",
  fecha_fin: "",
};

type SortKey = "nombre" | "precio" | "stock";
type SortDir = "asc" | "desc";

/* ===================== Component ===================== */
export default function AdminDiscounts() {
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState(defaultFormState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<ProductDiscount | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const productsQuery = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProducts,
  });

  const discountsQuery = useQuery({
    queryKey: ["descuentos"],
    queryFn: () => fetchDiscounts(),
  });

  const createMutation = useMutation({
    mutationFn: createDiscounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["descuentos"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DiscountPayload> }) =>
      updateDiscount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["descuentos"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["descuentos"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const sortedDiscounts = useMemo(() => {
    return (discountsQuery.data ?? []).slice().sort((a, b) => {
      const aStart = new Date(a.fecha_inicio).getTime();
      const bStart = new Date(b.fecha_inicio).getTime();
      return bStart - aStart;
    });
  }, [discountsQuery.data]);

  const filteredProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    const normalized = normalizeText(productSearch);
    const filtered = normalized
      ? list.filter((p) => normalizeText(p.nombre).includes(normalized))
      : list.slice();

    const comparator = (a: any, b: any) => {
      const va =
        sortKey === "nombre"
          ? normalizeText(a.nombre)
          : sortKey === "precio"
          ? Number(a.precio)
          : Number(a.stock);
      const vb =
        sortKey === "nombre"
          ? normalizeText(b.nombre)
          : sortKey === "precio"
          ? Number(b.precio)
          : Number(b.stock);

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    };

    return filtered.sort(comparator);
  }, [productSearch, productsQuery.data, sortKey, sortDir]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingDiscount(null);
    setProductSearch("");
    setFeedback(null);
  };

  const handleEdit = (discount: ProductDiscount) => {
    setEditingDiscount(discount);
    setFormState({
      selectedProducts: [discount.producto.id],
      porcentaje: Number(discount.porcentaje).toString(),
      // Convertir ISO -> local La Paz para el input
      fecha_inicio: isoToLaPazLocal(discount.fecha_inicio),
      fecha_fin: isoToLaPazLocal(discount.fecha_fin),
    });
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (discount: ProductDiscount) => {
    if (confirm(`¿Eliminar el descuento de "${discount.producto.nombre}"?`)) {
      deleteMutation.mutate(discount.id);
    }
  };

  const handleToggleProduct = (productId: number) => {
    setFormState((prev) => {
      if (editingDiscount) {
        return { ...prev, selectedProducts: [productId] };
      }
      const alreadySelected = prev.selectedProducts.includes(productId);
      const selectedProducts = alreadySelected
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId];
      return { ...prev, selectedProducts };
    });
  };

  const handleQuickPercent = (value: number) => {
    setFormState((prev) => ({ ...prev, porcentaje: String(value) }));
  };

  /** Suma días siempre en hora de La Paz */
  const handleQuickRange = (days: number) => {
    const startLocal = formState.fecha_inicio || nowLaPazLocal();
    const endLocal = addDaysLocalLaPaz(startLocal, days);
    setFormState((prev) => ({
      ...prev,
      fecha_inicio: startLocal,
      fecha_fin: endLocal,
    }));
  };

  const handleSelectAllFiltered = () => {
    if (editingDiscount) return;
    const ids = filteredProducts.map((p: any) => p.id);
    setFormState((prev) => ({
      ...prev,
      selectedProducts: Array.from(new Set([...prev.selectedProducts, ...ids])),
    }));
  };

  const handleClearSelection = () => {
    setFormState((prev) => ({ ...prev, selectedProducts: [] }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const porcentajeNumber = Number(formState.porcentaje);
    if (!porcentajeNumber || Number.isNaN(porcentajeNumber)) {
      setFeedback("Ingresa un porcentaje de descuento válido.");
      return;
    }
    if (porcentajeNumber <= 0 || porcentajeNumber >= 100) {
      setFeedback("El porcentaje debe ser mayor a 0 y menor a 100.");
      return;
    }
    if (!formState.fecha_inicio) {
      setFeedback("Selecciona la fecha de inicio del descuento.");
      return;
    }
    if (!editingDiscount && formState.selectedProducts.length === 0) {
      setFeedback("Debes seleccionar al menos un producto para aplicar el descuento.");
      return;
    }
    if (formState.fecha_fin) {
      // Validar fin > inicio en el mismo marco horario (La Paz)
      const startISO = laPazLocalToISO(formState.fecha_inicio)!;
      const endISO = laPazLocalToISO(formState.fecha_fin);
      if (!endISO || new Date(endISO) <= new Date(startISO)) {
        setFeedback("La fecha de finalización debe ser posterior a la fecha de inicio (hora Bolivia).");
        return;
      }
    }

    // Convertir a ISO (UTC) para la API
    const payload: DiscountPayload = {
      porcentaje: porcentajeNumber,
      fecha_inicio: laPazLocalToISO(formState.fecha_inicio)!,
      fecha_fin: laPazLocalToISO(formState.fecha_fin || "") || null,
    };

    if (editingDiscount) {
      payload.producto_id = formState.selectedProducts[0];
      updateMutation.mutate(
        { id: editingDiscount.id, payload },
        {
          onSuccess: () => {
            setFeedback("✅ Descuento actualizado correctamente.");
            resetForm();
          },
          onError: () => setFeedback("No pudimos actualizar el descuento. Revisa los datos."),
        }
      );
      return;
    }

    payload.productos = formState.selectedProducts;
    createMutation.mutate(payload, {
      onSuccess: () => {
        setFeedback("✅ Descuentos creados correctamente.");
        resetForm();
      },
      onError: () => setFeedback("No pudimos crear los descuentos. Revisa los datos ingresados."),
    });
  };

  const getStatus = (discount: ProductDiscount) => {
    const now = new Date();
    const start = new Date(discount.fecha_inicio);
    const end = discount.fecha_fin ? new Date(discount.fecha_fin) : null;
    if (end && end < now) {
      return { label: "Expirado", className: "bg-gray-100 text-gray-600 border border-gray-200" };
    }
    if (start > now) {
      return { label: "Programado", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    }
    return { label: "Activo", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const productsCount = productsQuery.data?.length ?? 0;
  const selectedCount = formState.selectedProducts.length;

  return (
    <section className="space-y-6">
      {/* ===== Header ===== */}
      <header className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Gestión de descuentos</p>
            <h1 className="text-3xl font-semibold text-gray-900">Promociones por producto</h1>
            <p className="text-sm text-gray-500">
              Define periodos y porcentajes; se reflejan en tienda y carrito en tiempo real.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Productos disponibles</p>
              <p className="text-lg font-semibold text-gray-900">{productsCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Descuentos activos</p>
              <p className="text-lg font-semibold text-gray-900">
                {sortedDiscounts.filter((d) => getStatus(d).label === "Activo").length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Form ===== */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingDiscount ? "Editar descuento" : "Crear nuevo descuento"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Selecciona {editingDiscount ? "un" : "uno o varios"} productos y define el periodo.
            </p>
          </div>

          {editingDiscount ? (
            <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              Modo edición
            </div>
          ) : (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              Modo creación
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-6 lg:grid-cols-[420px,1fr]">
          {/* Selector de productos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="discount-product-search">
                Productos en descuento
              </label>
              <span className="text-xs text-gray-500">
                Seleccionados: <span className="font-semibold text-gray-900">{selectedCount}</span>
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="discount-product-search"
                type="search"
                placeholder="Buscar por nombre…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  aria-label="Ordenar por"
                  className="rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as any)}
                >
                  <option value="nombre">Nombre</option>
                  <option value="precio">Precio</option>
                  <option value="stock">Stock</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  title={sortDir === "asc" ? "Ascendente" : "Descendente"}
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            {!editingDiscount && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="rounded-xl border border-primary/40 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  Seleccionar todo (filtro)
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-xl border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Limpiar selección
                </button>
              </div>
            )}

            <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {productsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-100"
                    />
                  ))}
                </div>
              ) : productsQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  No pudimos cargar los productos. Intenta nuevamente más tarde.
                </div>
              ) : !filteredProducts.length ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  No encontramos productos que coincidan con “{productSearch}”.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredProducts.map((product: any) => {
                    const isSelected = formState.selectedProducts.includes(product.id);
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => handleToggleProduct(product.id)}
                        className={classNames(
                          "group flex h-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-gray-100 hover:border-primary/40 hover:shadow-md"
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="relative h-32 w-full overflow-hidden border-b border-gray-100 bg-gray-50">
                          {product.imagen ? (
                            <img
                              src={product.imagen}
                              alt={product.nombre}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                              Sin imagen
                            </div>
                          )}
                          {isSelected && (
                            <span className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-white shadow">
                              Seleccionado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">
                            {product.categoria?.nombre ?? "Sin categoría"}
                          </p>
                          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                            {product.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {currencyFormatter.format(Number(product.precio))}
                          </p>
                          <p className="mt-auto text-xs text-gray-400">
                            Stock disponible: {product.stock}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {editingDiscount ? (
              <p className="text-xs text-gray-500">
                Estás editando un descuento existente. Solo puedes seleccionar un producto.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Haz clic en las tarjetas para seleccionar múltiples productos. El mismo descuento se
                aplicará a todos los seleccionados.
              </p>
            )}
          </div>

          {/* Configuración de descuento */}
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-percentage">
                  Porcentaje %
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="discount-percentage"
                    type="number"
                    min={1}
                    max={90}
                    step="0.5"
                    value={formState.porcentaje}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, porcentaje: e.target.value }))
                    }
                    className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Ej. 15"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[5, 10, 15, 20, 25, 30].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleQuickPercent(v)}
                        className={classNames(
                          "rounded-xl border px-2 py-1 text-xs font-semibold transition",
                          Number(formState.porcentaje) === v
                            ? "border-primary text-primary bg-primary/5"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        )}
                        title={`Usar ${v}%`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  aria-label="Porcentaje slider"
                  type="range"
                  min={1}
                  max={90}
                  step="1"
                  value={Number(formState.porcentaje || 0)}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, porcentaje: e.target.value }))
                  }
                  className="mt-3 w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-start">
                  Fecha de inicio (hora Bolivia)
                </label>
                <input
                  id="discount-start"
                  type="datetime-local"
                  value={formState.fecha_inicio}
                  onChange={(e) => setFormState((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                  onBlur={() => {
                    // Si está vacío al salir, setear ahora La Paz para conveniencia
                    if (!formState.fecha_inicio) {
                      setFormState((prev) => ({ ...prev, fecha_inicio: nowLaPazLocal() }));
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Siempre se interpreta en {LA_PAZ_TZ}.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-end">
                  Fecha de finalización (hora Bolivia, opcional)
                </label>
                <input
                  id="discount-end"
                  type="datetime-local"
                  value={formState.fecha_fin}
                  onChange={(e) => setFormState((prev) => ({ ...prev, fecha_fin: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleQuickRange(d)}
                      className="rounded-xl border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      title={`Sumar ${d} días (hora Bolivia)`}
                    >
                      +{d} días
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormState((p) => ({ ...p, fecha_fin: "" }))}
                    className="rounded-xl border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Sin fin
                  </button>
                </div>
              </div>
            </div>

            {feedback && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {feedback}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Guardando…"
                  : editingDiscount
                  ? "Actualizar descuento"
                  : "Crear descuento"}
              </button>

              {editingDiscount ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar edición
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormState(defaultFormState)}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Limpiar formulario
                </button>
              )}
            </div>

            {!!selectedCount && !editingDiscount && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-medium text-gray-500">Seleccionados:</p>
                <div className="flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">
                  {formState.selectedProducts.map((id) => {
                    const p = (productsQuery.data ?? []).find((x: any) => x.id === id);
                    if (!p) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                      >
                        {p.nombre}
                        <button
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              selectedProducts: prev.selectedProducts.filter((x) => x !== id),
                            }))
                          }
                          className="rounded-full border border-gray-300 px-1 leading-none text-gray-500 hover:bg-gray-100"
                          title="Quitar"
                          aria-label={`Quitar ${p.nombre}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* ===== Listado de descuentos ===== */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Descuentos configurados</h2>
          <span className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-900">{sortedDiscounts.length}</span>
          </span>
        </div>

        {discountsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-3xl border border-gray-100 bg-gray-100" />
            ))}
          </div>
        ) : discountsQuery.isError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            No pudimos cargar los descuentos configurados.
          </div>
        ) : !sortedDiscounts.length ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Aún no configuraste descuentos para tus productos.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDiscounts.map((discount) => {
              const status = getStatus(discount);
              return (
                <article
                  key={discount.id}
                  className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden h-16 w-16 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 sm:block">
                      {discount.producto.imagen ? (
                        <img
                          src={discount.producto.imagen}
                          alt={discount.producto.nombre}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        {discount.producto.categoria?.nombre ?? "Sin categoría"}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">{discount.producto.nombre}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(discount.fecha_inicio).toLocaleString("es-BO", { timeZone: LA_PAZ_TZ })}{" "}
                        {discount.fecha_fin
                          ? `→ ${new Date(discount.fecha_fin).toLocaleString("es-BO", { timeZone: LA_PAZ_TZ })}`
                          : "→ Sin fecha de finalización"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-700 lg:text-right">
                    <span className="text-xs">
                      Precio original:{" "}
                      <span className="font-semibold text-gray-900">
                        {currencyFormatter.format(Number(discount.precio_original))}
                      </span>
                    </span>
                    <span className="text-xs">
                      Precio con descuento:{" "}
                      <span className="font-semibold text-primary">
                        {currencyFormatter.format(Number(discount.precio_con_descuento))}
                      </span>
                    </span>
                    <span className="text-xs">
                      Descuento aplicado:{" "}
                      <span className="font-semibold text-gray-900">
                        {Number(discount.porcentaje).toFixed(1)}%
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(discount)}
                        className="rounded-xl border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(discount)}
                        disabled={deleteMutation.isPending}
                        className="rounded-xl border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
