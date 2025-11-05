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

const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

const toISOIfPresent = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const defaultFormState = {
  selectedProducts: [] as number[],
  porcentaje: "",
  fecha_inicio: "",
  fecha_fin: "",
};

export default function AdminDiscounts() {
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState(defaultFormState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<ProductDiscount | null>(null);
  const [productSearch, setProductSearch] = useState("");

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
    if (!normalized) {
      return list;
    }
    return list.filter((product) => normalizeText(product.nombre).includes(normalized));
  }, [productSearch, productsQuery.data]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingDiscount(null);
    setProductSearch("");
  };

  const handleEdit = (discount: ProductDiscount) => {
    setEditingDiscount(discount);
    setFormState({
      selectedProducts: [discount.producto.id],
      porcentaje: Number(discount.porcentaje).toString(),
      fecha_inicio: toDateTimeLocal(discount.fecha_inicio),
      fecha_fin: toDateTimeLocal(discount.fecha_fin),
    });
  };

  const handleDelete = (discount: ProductDiscount) => {
    deleteMutation.mutate(discount.id);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const porcentajeNumber = Number(formState.porcentaje);
    if (!porcentajeNumber || Number.isNaN(porcentajeNumber)) {
      setFeedback("Ingresa un porcentaje de descuento valido.");
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

    const payload: DiscountPayload = {
      porcentaje: porcentajeNumber,
      fecha_inicio: new Date(formState.fecha_inicio).toISOString(),
      fecha_fin: toISOIfPresent(formState.fecha_fin),
    };

    if (editingDiscount) {
      payload.producto_id = formState.selectedProducts[0];
      updateMutation.mutate(
        {
          id: editingDiscount.id,
          payload,
        },
        {
          onSuccess: () => {
            setFeedback("Descuento actualizado correctamente.");
            resetForm();
          },
        }
      );
      return;
    }

    payload.productos = formState.selectedProducts;
    createMutation.mutate(payload, {
      onSuccess: () => {
        setFeedback("Descuento creado correctamente.");
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

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Gestion de descuentos</p>
            <h1 className="text-3xl font-semibold text-gray-900">Promociones por producto</h1>
            <p className="text-sm text-gray-500">
              Configura los periodos y porcentajes para destacar productos con precio promocional.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Los cambios se reflejan en la tienda y en el carrito en tiempo real.</p>
            <p>
              Productos disponibles:{" "}
              <span className="font-semibold text-gray-900">
                {productsQuery.data?.length ?? 0}
              </span>
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          {editingDiscount ? "Editar descuento" : "Crear nuevo descuento"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona uno o varios productos y define el periodo del descuento.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-[380px,1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="discount-product-search">
                Productos en descuento
              </label>
              <span className="text-xs text-gray-500">
                Seleccionados:{" "}
                <span className="font-semibold text-gray-900">{formState.selectedProducts.length}</span>
              </span>
            </div>
            <input
              id="discount-product-search"
              type="search"
              placeholder="Buscar por nombre..."
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />

            <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
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
                  {filteredProducts.map((product) => {
                    const isSelected = formState.selectedProducts.includes(product.id);
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => handleToggleProduct(product.id)}
                        className={classNames(
                          "flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-gray-100 hover:border-primary/40 hover:shadow-md"
                        )}
                      >
                        <div className="relative h-32 w-full overflow-hidden border-b border-gray-100 bg-gray-50">
                          {product.imagen ? (
                            <img
                              src={product.imagen}
                              alt={product.nombre}
                              className="h-full w-full object-cover"
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
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            {product.categoria?.nombre ?? "Sin categoría"}
                          </p>
                          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                            {product.nombre}
                          </h3>
                          <p className="text-sm text-gray-500">
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
                Haz clic en las tarjetas para seleccionar múltiples productos. Se aplicará el mismo
                descuento a todos los seleccionados.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-percentage">
                  Porcentaje %
                </label>
                <input
                  id="discount-percentage"
                  type="number"
                  min={1}
                  max={90}
                  step="0.5"
                  value={formState.porcentaje}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, porcentaje: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Ej. 15"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-start">
                  Fecha de inicio
                </label>
                <input
                  id="discount-start"
                  type="datetime-local"
                  value={formState.fecha_inicio}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fecha_inicio: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="discount-end">
                  Fecha de finalizacion (opcional)
                </label>
                <input
                  id="discount-end"
                  type="datetime-local"
                  value={formState.fecha_fin}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fecha_fin: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {feedback && <p className="text-sm text-amber-600">{feedback}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Guardando..."
                  : editingDiscount
                  ? "Actualizar descuento"
                  : "Crear descuento"}
              </button>
              {editingDiscount && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar edicion
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Descuentos configurados</h2>
          <span className="text-sm text-gray-500">
            Total registrados:{" "}
            <span className="font-semibold text-gray-900">{sortedDiscounts.length}</span>
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
            Aun no configuraste descuentos para tus productos.
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
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {discount.producto.categoria?.nombre ?? "Sin categoria"}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">{discount.producto.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(discount.fecha_inicio).toLocaleString("es-MX")}{" "}
                      {discount.fecha_fin
                        ? `→ ${new Date(discount.fecha_fin).toLocaleString("es-MX")}`
                        : "→ Sin fecha de finalización"}
                    </p>
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
                      <span className="font-semibold text-gray-900">{Number(discount.porcentaje).toFixed(1)}%</span>
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
