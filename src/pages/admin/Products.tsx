import { useState } from "react";
import type { FormEvent } from "react";
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

export default function AdminProducts() {
  const [productForm, setProductForm] = useState<ProductFormState>(blankProductForm);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productFeedback, setProductFeedback] = useState<string | null>(null);
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
    mutationFn: ({ id, payload }: { id: number | null; payload: ProductPayload }) =>
      id ? updateProduct(id, payload) : createProduct(payload),
    onMutate: () => setProductFeedback(null),
    onSuccess: async (_, variables) => {
      clearProductCaches();
      await refetchProducts();
      setProductFeedback(
        variables.id ? "Producto actualizado correctamente." : "Producto creado correctamente."
      );
      setProductForm(blankProductForm);
      setEditingProductId(null);
      setFileInputResetKey((value) => value + 1);
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
    if (descripcion) {
      payload.descripcion = descripcion;
    } else if (editingProductId && productForm.descripcion === "") {
      payload.descripcion = "";
    }

    const lowStockValue = Number(productForm.low_stock_threshold);
    if (!Number.isNaN(lowStockValue) && productForm.low_stock_threshold !== undefined) {
      payload.low_stock_threshold = lowStockValue;
    }

    if (productForm.categoria_id) {
      payload.categoria_id = Number(productForm.categoria_id);
    } else if (editingProductId && productForm.categoria_id === "") {
      payload.categoria_id = null;
    }

    const imagenUrl = productForm.imagen.trim();
    if (imagenUrl) {
      payload.imagen = imagenUrl;
    } else if (editingProductId && productForm.imagen === "") {
      payload.imagen = "";
    }

    if (productForm.imagen_archivo) {
      payload.imagen_archivo = productForm.imagen_archivo;
    }

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
    setFileInputResetKey((value) => value + 1);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Gestion de productos</p>
          <h2 className="text-3xl font-semibold text-gray-900">Controla stock y precios</h2>
          <p className="text-sm text-gray-500">
            Crea, edita y elimina productos sin salir del panel.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 text-sm text-gray-500 lg:items-end">
          <span>El listado se actualiza automaticamente al guardar cambios.</span>
          <Link to="/admin/bajo-stock" className="font-semibold text-primary hover:underline">
            Revisar productos con stock bajo
          </Link>
        </div>
      </header>

      {productsLoading ? (
        <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
          <div className="h-[32rem] rounded-3xl border border-gray-100 bg-gray-50 animate-pulse" />
          <div className="h-[32rem] rounded-3xl border border-gray-100 bg-gray-50 animate-pulse" />
        </div>
      ) : productsError ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No pudimos obtener los productos. Intenta nuevamente.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
          <form
            onSubmit={handleProductSubmit}
            className="space-y-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="product-name">
                Nombre
              </label>
              <input
                id="product-name"
                value={productForm.nombre}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, nombre: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Ej. Laptop 15.6"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="product-category">
                  Categoria
                </label>
                <select
                  id="product-category"
                  value={productForm.categoria_id}
                  disabled={categoriesQuery.isLoading}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, categoria_id: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Sin categoria</option>
                  {categoriesQuery.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="product-price">
                  Precio
                </label>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  value={productForm.precio}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, precio: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="product-stock">
                  Stock
                </label>
                <input
                  id="product-stock"
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock: Number(event.target.value) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor="product-threshold">
                  Alerta Stock
                </label>
                <input
                  id="product-threshold"
                  type="number"
                  min={0}
                  value={productForm.low_stock_threshold}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      low_stock_threshold: Number(event.target.value) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              
              </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="product-image">
                Imagen (URL)
              </label>
              <input
                id="product-image"
                value={productForm.imagen}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, imagen: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="https://..."
              />
              <label
                className="mt-3 block text-sm font-medium text-gray-700"
                htmlFor="product-image-file"
              >
                Imagen (archivo)
              </label>
              <input
                key={fileInputResetKey}
                id="product-image-file"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    imagen_archivo: event.target.files?.[0] ?? null,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              {productForm.imagen_archivo ? (
                <p className="mt-1 text-xs text-gray-500">
                  Archivo seleccionado: {productForm.imagen_archivo.name}
                </p>
              ) : productForm.imagen ? (
                <p className="mt-1 text-xs text-gray-500">
                  Imagen actual: {productForm.imagen}
                </p>
              ) : null}
            </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="product-description">
                Descripcion
              </label>
              <textarea
                id="product-description"
                rows={3}
                value={productForm.descripcion}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Detalles breves del producto"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={productMutation.isPending}
                className="flex-1 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
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
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(blankProductForm);
                    setFileInputResetKey((value) => value + 1);
                  }}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
            {productFeedback && <p className="text-xs text-gray-500">{productFeedback}</p>}
          </form>

          <div className="overflow-auto rounded-3xl border border-gray-100 bg-white">
            {products && products.length ? (
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Categoria</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Stock</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Umbral</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Precio</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{product.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {product.categoria?.nombre || "Sin categoria"}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{product.stock}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {product.low_stock_threshold ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {currencyFormatter.format(Number(product.precio))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProductEdit(product)}
                            className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            disabled={deleteProductMutation.isPending}
                            className="rounded-xl bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-sm text-gray-500">
                Todavia no hay productos registrados en la base de datos.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}



