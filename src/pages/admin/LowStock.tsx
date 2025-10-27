import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package } from "lucide-react";
import { fetchLowStockProducts, type Product } from "../../api";
import { currencyFormatter } from "./shared";

const getSeverityBadge = (product: Product) => {
  if (product.stock === 0) {
    return {
      label: "Sin stock",
      className: "border border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Stock critico",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  };
};

export default function AdminLowStock() {
  const lowStockQuery = useQuery({
    queryKey: ["productos-low-stock"],
    queryFn: fetchLowStockProducts,
  });

  const alerts = useMemo(() => {
    const data = lowStockQuery.data ?? [];
    return data.map((product) => ({
      product,
      shortage: Math.max(product.low_stock_threshold - product.stock, 0),
      severity: getSeverityBadge(product),
    }));
  }, [lowStockQuery.data]);

  const totalShortage = useMemo(
    () => alerts.reduce((total, alert) => total + alert.shortage, 0),
    [alerts]
  );

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-white p-2 text-amber-500 shadow-sm">
              <AlertTriangle size={20} />
            </span>
            <div>
              <p className="text-sm font-medium text-amber-700">Alertas de inventario</p>
              <h1 className="text-3xl font-semibold text-amber-900">Productos con stock bajo</h1>
              <p className="text-sm text-amber-800">
                Revisa los articulos que cruzaron el umbral configurado y gestiona reposiciones
                oportunas para evitar quiebres.
              </p>
            </div>
          </div>

          <Link
            to="/admin/productos"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            <Package size={16} />
            Gestionar inventario
          </Link>
        </div>

        <div className="mt-6 grid gap-3 text-sm text-amber-800 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-500">Total alertas</p>
            <p className="text-2xl font-semibold text-amber-900">{alerts.length}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-500">Unidades faltantes</p>
            <p className="text-2xl font-semibold text-amber-900">{totalShortage}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-500">Última sincronizacion</p>
            <p className="text-sm text-amber-700">
              {new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
      </header>

      {lowStockQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-3xl border border-gray-100 bg-gray-100"
            />
          ))}
        </div>
      ) : lowStockQuery.isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
          No pudimos obtener las alertas de stock bajo. Intenta nuevamente en unos segundos.
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-700">
          ¡Inventario saludable! No hay productos por debajo del umbral configurado.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(({ product, shortage, severity }) => (
            <article
              key={product.id}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {product.categoria?.nombre ?? "Sin categoria"}
                  </p>
                  <h2 className="text-xl font-semibold text-gray-900">{product.nombre}</h2>
                  {product.descripcion && (
                    <p className="mt-1 text-sm text-gray-500">
                      {product.descripcion.length > 120
                        ? `${product.descripcion.slice(0, 120)}…`
                        : product.descripcion}
                    </p>
                  )}
                </div>

                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${severity.className}`}>
                  <AlertTriangle size={14} />
                  {severity.label}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Stock actual</p>
                  <p className="text-lg font-semibold text-gray-900">{product.stock}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Umbral</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {product.low_stock_threshold}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Faltantes</p>
                  <p className="text-lg font-semibold text-gray-900">{shortage}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Precio actual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {currencyFormatter.format(Number(product.precio))}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
