import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
  type Product,
  type ProductPayload,
} from "../../api";
import { currencyFormatter } from "./shared";
import { invalidateCacheKeys } from "../../core/offlineCache";
import {
  Loader2,
  Search,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

/* ===================== Tipos y estado ===================== */
type ProductFormState = {
  nombre: string;
  descripcion: string;
  precio: string;
  stock: number;
  low_stock_threshold: number;
  categoria_id: string;
  imagen: string;
  imagen_archivo: File | null;
};

const blankProductForm: ProductFormState = {
  nombre: "",
  descripcion: "",
  precio: "",
  stock: 0,
  low_stock_threshold: 0,
  categoria_id: "",
  imagen: "",
  imagen_archivo: null,
};

/* ===================== Helpers UI ===================== */
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminProducts() {
  const [productForm, setProductForm] =
    useState<ProductFormState>(blankProductForm);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productFeedback, setProductFeedback] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nombre" | "stock" | "precio">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProducts,
    staleTime: 0,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categorias-admin"],
    queryFn: fetchCategories,
  });

  const clearProductCaches = () => {
    invalidateCacheKeys("productos", "productos-low-stock");
    queryClient.invalidateQueries({ queryKey: ["productos"] });
    queryClient.invalidateQueries({ queryKey: ["productos-low-stock"] });
  };

  const productMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | null;
      payload: ProductPayload;
    }) => (id ? updateProduct(id, payload) : createProduct(payload)),
    onMutate: () => setProductFeedback(null),
    onSuccess: async (_, variables) => {
      clearProductCaches();
      await refetchProducts();
      setProductFeedback(
        variables.id
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente."
      );
      setProductForm(blankProductForm);
      setEditingProductId(null);
      setFileInputResetKey((v) => v + 1);
    },
    onError: () => setProductFeedback("No pudimos guardar el producto."),
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: () => setProductFeedback(null),
    onSuccess: async () => {
      clearProductCaches();
      await refetchProducts();
      setProductFeedback("Producto eliminado.");
      setConfirmDelete(null);
    },
    onError: () => setProductFeedback("No pudimos eliminar el producto."),
  });

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productForm.nombre.trim() || !productForm.precio) {
      setProductFeedback("El producto necesita un nombre y un precio.");
      return;
    }

    const payload: ProductPayload = {
      nombre: productForm.nombre.trim(),
      precio: productForm.precio,
      stock: Number(productForm.stock) || 0,
    };

    const descripcion = productForm.descripcion.trim();
    if (descripcion) payload.descripcion = descripcion;
    else if (editingProductId && productForm.descripcion === "")
      payload.descripcion = "";

    const lowStockValue = Number(productForm.low_stock_threshold);
    if (
      !Number.isNaN(lowStockValue) &&
      productForm.low_stock_threshold !== undefined
    ) {
      payload.low_stock_threshold = lowStockValue;
    }

    if (productForm.categoria_id)
      payload.categoria_id = Number(productForm.categoria_id);
    else if (editingProductId && productForm.categoria_id === "")
      payload.categoria_id = null;

    const imagenUrl = productForm.imagen.trim();
    if (imagenUrl) payload.imagen = imagenUrl;
    else if (editingProductId && productForm.imagen === "") payload.imagen = "";

    if (productForm.imagen_archivo)
      payload.imagen_archivo = productForm.imagen_archivo;

    productMutation.mutate({ id: editingProductId, payload });
  };

  const handleProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      precio: product.precio,
      stock: product.stock,
      low_stock_threshold: product.low_stock_threshold,
      categoria_id: product.categoria?.id ? String(product.categoria.id) : "",
      imagen: product.imagen ?? "",
      imagen_archivo: null,
    });
    setFileInputResetKey((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingProductId(null);
    setProductForm(blankProductForm);
    setFileInputResetKey((v) => v + 1);
  };

  /* ===================== Filtro + orden ===================== */
  const debouncedQuery = useDebounced(query);
  const filteredSorted = useMemo(() => {
    const base = (products ?? []).filter((p) => {
      if (!debouncedQuery.trim()) return true;
      const q = debouncedQuery.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.categoria?.nombre?.toLowerCase() ?? "").includes(q)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return base.sort((a, b) => {
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre) * dir;
      if (sortBy === "stock") return (a.stock - b.stock) * dir;
      const pa = Number(a.precio);
      const pb = Number(b.precio);
      return (pa - pb) * dir;
    });
  }, [products, debouncedQuery, sortBy, sortDir]);

  /* ===================== UI ===================== */
  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-primary">
            Gestión de productos
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Controla stock y precios
          </h2>
          <p className="text-sm text-gray-500">
            Crea, edita y elimina productos sin salir del panel.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-0 transition focus:border-primary"
            />
          </div>
          <Link
            to="/admin/bajo-stock"
            className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Ver bajo stock
          </Link>
        </div>
      </header>

      {/* Feedback banner */}
      {productFeedback && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/10">
            ✅
          </span>
          <div className="flex-1 min-w-0">{productFeedback}</div>
          <button
            onClick={() => setProductFeedback(null)}
            className="text-emerald-700/70 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading / Error */}
      {productsLoading ? (
        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <div className="h-[36rem] animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
          <div className="h-[36rem] animate-pulse rounded-3xl border border-gray-100 bg-gray-50" />
        </div>
      ) : productsError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          No pudimos obtener los productos. Intenta nuevamente.
        </div>
      ) : (
        <div className="grid gap-1 xl:grid-cols-[420px,1fr]">
          {/* Formulario (prioriza no-desborde y espacios) */}
          <form
            onSubmit={handleProductSubmit}
            className="sticky top-4 space-y-6 self-start rounded-3xl border border-gray-100 bg-white p-7 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">
                  {editingProductId ? "Editar producto" : "Nuevo producto"}
                </h3>
                <p className="text-xs text-gray-500">
                  Completa la información del producto. Los campos se pueden
                  dejar vacíos si no aplican.
                </p>
              </div>
              {productMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="product-name"
              >
                Nombre
              </label>
              <input
                id="product-name"
                value={productForm.nombre}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    nombre: e.target.value,
                  }))
                }
                placeholder="Ej. Laptop 15.6"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              />
            </div>

            {/* Datos principales */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="product-category"
                >
                  Categoría
                </label>
                <select
                  id="product-category"
                  value={productForm.categoria_id}
                  disabled={categoriesQuery.isLoading}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      categoria_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                >
                  <option value="">Sin categoría</option>
                  {categoriesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="product-price"
                >
                  Precio
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-2.5 text-xs text-gray-500">
                    $
                  </span>
                  <input
                    id="product-price"
                    type="number"
                    step="0.01"
                    value={productForm.precio}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        precio: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-7 py-2.5 text-sm outline-none transition focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Stock y umbral */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="product-stock"
                >
                  Stock
                </label>
                <input
                  id="product-stock"
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="product-threshold"
                >
                  Alerta stock
                </label>
                <input
                  id="product-threshold"
                  type="number"
                  min={0}
                  value={productForm.low_stock_threshold}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      low_stock_threshold: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="product-description"
              >
                Descripción
              </label>
              <textarea
                id="product-description"
                rows={4}
                value={productForm.descripcion}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Detalles breves del producto"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              />
            </div>

            {/* ===== Imagen (URL / archivo) — movido abajo y a prueba de desbordes ===== */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-800">
                Imagen del producto
              </h4>

              {/* Preview centrada */}
              <div className="flex gap-4 sm:gap-5">
                <div className="flex aspect-square w-32 sm:w-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 shrink-0">
                  {productForm.imagen_archivo ? (
                    <img
                      src={URL.createObjectURL(productForm.imagen_archivo)}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : productForm.imagen ? (
                    <img
                      src={productForm.imagen}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-gray-400" />
                  )}
                </div>

                <div className="grid w-full min-w-0 gap-3">
                  {/* URL */}
                  <div className="space-y-2 min-w-0">
                    <label
                      className="text-sm font-medium text-gray-700"
                      htmlFor="product-image"
                    >
                      Imagen (URL)
                    </label>
                    <input
                      id="product-image"
                      type="url"
                      value={productForm.imagen}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          imagen: e.target.value,
                        }))
                      }
                      placeholder="https://…"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary font-mono"
                    />
                    {/* Muestra segura para URLs muy largas */}
                    {productForm.imagen && (
                      <div
                        className="max-h-16 overflow-auto rounded-xl bg-gray-50 p-2 text-[11px] leading-4 text-gray-600 break-all"
                        title={productForm.imagen}
                      >
                        {productForm.imagen}
                      </div>
                    )}
                  </div>

                  {/* Archivo */}
                  <div className="space-y-2 min-w-0">
                    <label
                      className="block text-sm font-medium text-gray-700"
                      htmlFor="product-image-file"
                    >
                      o subir archivo
                    </label>
                    <input
                      key={fileInputResetKey}
                      id="product-image-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          imagen_archivo: e.target.files?.[0] ?? null,
                        }))
                      }
                      className="sr-only"
                    />

                    {/* Botón que abre el selector */}
                    <label
                      htmlFor="product-image-file"
                      className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-6 py-2.5 text-sm font-semibold hover:bg-gray-100"
                    >
                      Seleccionar archivo
                    </label>
                    {productForm.imagen_archivo && (
                      <div
                        className="rounded-xl bg-gray-50 p-2 text-[11px] leading-4 text-gray-600 break-all"
                        title={productForm.imagen_archivo.name}
                      >
                        {productForm.imagen_archivo.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={productMutation.isPending}
                className="flex-1 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {productMutation.isPending
                  ? "Guardando..."
                  : editingProductId
                  ? "Guardar cambios"
                  : "Agregar producto"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Listado (SIN CAMBIOS relevantes) */}
          <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white">
            {filteredSorted && filteredSorted.length ? (
              <div className="relative">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div className="text-sm text-gray-600">
                    {filteredSorted.length} producto
                    {filteredSorted.length === 1 ? "" : "s"}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Ordenar por</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm"
                    >
                      <option value="nombre">Nombre</option>
                      <option value="stock">Stock</option>
                      <option value="precio">Precio</option>
                    </select>
                    <button
                      onClick={() =>
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="rounded-xl border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                      title="Invertir orden"
                    >
                      {sortDir === "asc" ? "Asc" : "Desc"}
                    </button>
                  </div>
                </div>

                <table className="min-w-[860px] w-full table-fixed divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-[42%]">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-[18%]">
                        Categoría
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-[10%]">
                        Stock
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-[10%]">
                        Umbral
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 w-[10%]">
                        Precio
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500 w-40">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredSorted.map((product) => {
                      const isLow =
                        (product.low_stock_threshold ?? 0) > 0 &&
                        product.stock <= (product.low_stock_threshold ?? 0);
                      return (
                        <tr
                          key={product.id}
                          className={cx(isLow && "bg-red-50/40")}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shrink-0">
                                {product.imagen ? (
                                  <img
                                    src={product.imagen}
                                    alt={product.nombre}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="font-semibold text-gray-900 truncate max-w-[28rem]"
                                  title={product.nombre}
                                >
                                  {product.nombre}
                                </div>
                                {product.descripcion && (
                                  <div className="line-clamp-1 text-xs text-gray-500">
                                    {product.descripcion}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                              {product.categoria?.nombre || "Sin categoría"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cx(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                isLow
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              )}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {product.low_stock_threshold ?? 0}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {currencyFormatter.format(Number(product.precio))}
                          </td>
                          <td className="px-4 py-3 w-40 text-right">
                            <div className="inline-flex gap-2 flex-nowrap">
                              <button
                                type="button"
                                onClick={() => handleProductEdit(product)}
                                className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    id: product.id,
                                    name: product.nombre,
                                  })
                                }
                                disabled={deleteProductMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                  Eliminar
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid place-items-center p-10 text-center">
                <div className="mx-auto max-w-sm space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="text-base font-semibold">
                    Aún no hay productos
                  </h4>
                  <p className="text-sm text-gray-500">
                    Crea tu primer producto desde el formulario izquierdo.
                    También puedes importar datos desde tu backend si ya
                    existen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <h4 className="text-base font-semibold">Eliminar producto</h4>
            <p className="mt-1 text-sm text-gray-600">
              ¿Seguro que deseas eliminar{" "}
              <span className="font-semibold">{confirmDelete.name}</span>? Esta
              acción no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteProductMutation.mutate(confirmDelete.id)}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
