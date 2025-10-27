import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FileText, Package, Users2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  fetchAllInvoices,
  fetchProducts,
  fetchSalesHistory,
  fetchSalesPredictions,
  fetchUsers,
} from "../../api";
import { chartColors, currencyFormatter, numberFormatter } from "./shared";

export default function AdminDashboard() {
  const usersQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsers,
  });

  const productsQuery = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProducts,
  });

  const invoicesQuery = useQuery({
    queryKey: ["facturas-admin"],
    queryFn: fetchAllInvoices,
  });

  const historyQuery = useQuery({
    queryKey: ["ventas-historicas"],
    queryFn: fetchSalesHistory,
  });

  const predictionsQuery = useQuery({
    queryKey: ["ventas-predicciones"],
    queryFn: fetchSalesPredictions,
  });

  const totalStock = useMemo(
    () => (productsQuery.data ?? []).reduce((sum, product) => sum + product.stock, 0),
    [productsQuery.data]
  );

  const totalRevenue = useMemo(
    () =>
      (invoicesQuery.data ?? []).reduce(
        (sum, invoice) => sum + Number(invoice.amount_total),
        0
      ),
    [invoicesQuery.data]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Usuarios",
        value: usersQuery.data?.length ?? 0,
        helper: "Registrados",
        icon: Users2,
      },
      {
        label: "Productos",
        value: productsQuery.data?.length ?? 0,
        helper: "Publicados",
        icon: Package,
      },
      {
        label: "Inventario",
        value: numberFormatter.format(totalStock),
        helper: "Unidades disponibles",
        icon: Boxes,
      },
      {
        label: "Facturacion",
        value: currencyFormatter.format(totalRevenue),
        helper: `${invoicesQuery.data?.length ?? 0} facturas`,
        icon: FileText,
      },
    ],
    [usersQuery.data, productsQuery.data, totalStock, totalRevenue, invoicesQuery.data]
  );

  const chartData = useMemo(() => {
    const historic = historyQuery.data?.monthly_totals ?? [];
    const predicted = predictionsQuery.data?.predictions ?? [];

    const combined: { label: string; historico?: number; prediccion?: number }[] = historic.map(
      (item) => ({
        label: item.label,
        historico: item.total,
      })
    );

    predicted.forEach((item) => {
      combined.push({
        label: item.label,
        prediccion: item.total,
      });
    });

    return combined;
  }, [historyQuery.data, predictionsQuery.data]);

  const isSummaryLoading =
    usersQuery.isLoading || productsQuery.isLoading || invoicesQuery.isLoading;
  const summaryError =
    usersQuery.isError || productsQuery.isError || invoicesQuery.isError;

  const predictionsMetadata = predictionsQuery.data?.metadata;

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Resumen general</p>
            <h1 className="text-3xl font-semibold text-gray-900">
              Gestiona la tienda en tiempo real
            </h1>
            <p className="text-sm text-gray-500">
              Controla usuarios, productos, inventario y facturas desde un solo lugar.
            </p>
          </div>
          <span className="text-sm text-gray-500 sm:text-right">
            Los indicadores se recalculan automaticamente.
          </span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isSummaryLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-3xl border border-gray-100 bg-gray-50 animate-pulse"
            />
          ))
        ) : summaryError ? (
          <p className="col-span-full rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            No pudimos cargar el resumen. Intenta nuevamente.
          </p>
        ) : (
          summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.helper}</p>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  </div>
                  <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon size={22} />
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium text-gray-700">{card.label}</p>
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Proyeccion de ventas</h2>
            <p className="text-sm text-gray-500">
              Compara historicos vs predicciones generadas por el modelo.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            IA y estadisticas
          </span>
        </div>
        {historyQuery.isLoading || predictionsQuery.isLoading ? (
          <p className="text-gray-500">Calculando informacion de ventas...</p>
        ) : historyQuery.isError || predictionsQuery.isError ? (
          <p className="text-red-500">No pudimos cargar los datos de ventas.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-64 rounded-2xl border border-gray-100 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="historico"
                      stroke={chartColors.actual}
                      name="Historico"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="prediccion"
                      stroke={chartColors.predicted}
                      name="Prediccion"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-64 rounded-2xl border border-gray-100 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyQuery.data?.by_product ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#94a3b8" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="total" fill={chartColors.bar} name="Top productos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Top clientes</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(historyQuery.data?.by_customer ?? []).map((item) => (
                    <li key={item.label} className="flex items-center justify-between">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-semibold text-gray-900">
                        {currencyFormatter.format(item.total)}
                      </span>
                    </li>
                  ))}
                  {!historyQuery.data?.by_customer?.length && (
                    <li className="text-sm text-gray-500">Aun no hay clientes destacados.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Detalle del modelo</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>
                    Entrenado:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.trained_at
                        ? new Date(predictionsMetadata.trained_at).toLocaleString("es-MX")
                        : "Automatico"}
                    </span>
                  </li>
                  <li>
                    Ultima prediccion:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.generated_at
                        ? new Date(predictionsMetadata.generated_at).toLocaleString("es-MX")
                        : "Reciente"}
                    </span>
                  </li>
                  <li>
                    Periodos (meses):
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.samples ?? "--"}
                    </span>
                  </li>
                  <li>
                    Facturas analizadas:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.invoice_count ?? "--"}
                    </span>
                  </li>
                  <li>
                    Productos activos:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.product_count ?? "--"}
                    </span>
                  </li>
                  <li>
                    Categorias activas:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.category_count ?? "--"}
                    </span>
                  </li>
                  <li>
                    Cobertura:
                    <span className="ml-2 font-semibold text-gray-900">
                      {predictionsMetadata?.period_from && predictionsMetadata?.period_to
                        ? `${predictionsMetadata.period_from} - ${predictionsMetadata.period_to}`
                        : "--"}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
