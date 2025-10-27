import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, RefreshCcw, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchSalesHistory,
  fetchSalesPredictions,
  retrainSalesModel,
  type CategoryForecast,
} from "../../api";
import { chartColors, currencyFormatter } from "./shared";

const combineSeries = (category: CategoryForecast) => {
  const byLabel = new Map<string, { label: string; historico?: number; prediccion?: number }>();

  category.historical.forEach((point) => {
    byLabel.set(point.label, { label: point.label, historico: point.total });
  });
  category.predictions.forEach((point) => {
    const current = byLabel.get(point.label) ?? { label: point.label };
    current.prediccion = point.total;
    byLabel.set(point.label, current);
  });

  return Array.from(byLabel.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const formatPeriodLabel = (label: string | number): string => {
  const raw = String(label);
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map((value) => Number(value));
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  }
  return raw;
};

export default function AdminSalesForecast() {
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ["ventas-historicas"],
    queryFn: fetchSalesHistory,
  });

  const predictionsQuery = useQuery({
    queryKey: ["ventas-predicciones"],
    queryFn: fetchSalesPredictions,
  });

  const trainMutation = useMutation({
    mutationFn: retrainSalesModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas-historicas"] });
      queryClient.invalidateQueries({ queryKey: ["ventas-predicciones"] });
    },
  });

  const combinedSeries = useMemo(() => {
    const historic = historyQuery.data?.monthly_totals ?? [];
    const predicted = predictionsQuery.data?.predictions ?? [];

    const merged: { label: string; historico?: number; prediccion?: number }[] = [];
    historic.forEach((point) => {
      merged.push({ label: point.label, historico: point.total });
    });
    predicted.forEach((point) => {
      merged.push({ label: point.label, prediccion: point.total });
    });
    return merged;
  }, [historyQuery.data, predictionsQuery.data]);

  const lastHistory = historyQuery.data?.monthly_totals.at(-1);
  const previousHistory = historyQuery.data?.monthly_totals.at(-2);
  const growthPercentage =
    lastHistory && previousHistory && previousHistory.total > 0
      ? ((lastHistory.total - previousHistory.total) / previousHistory.total) * 100
      : null;

  const nextPrediction = predictionsQuery.data?.predictions?.[0];
  const predictionsMetadata = predictionsQuery.data?.metadata;
  const categoryForecasts = predictionsQuery.data?.by_category ?? [];

  const isLoading = historyQuery.isLoading || predictionsQuery.isLoading;
  const hasError = historyQuery.isError || predictionsQuery.isError;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <TrendingUp size={22} />
          </span>
          <div>
            <p className="text-sm font-medium text-primary">Prediccion de ventas</p>
            <h1 className="text-3xl font-semibold text-gray-900">Modelo Random Forest</h1>
            <p className="text-sm text-gray-500">
              Proyecta ingresos futuros usando el historial de facturacion y un Random Forest
              Regressor entrenado sobre tus ventas mensuales.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {trainMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Entrenando...
            </>
          ) : (
            <>
              <RefreshCcw size={16} />
              Reentrenar modelo
            </>
          )}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Ultimo mes</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {lastHistory ? currencyFormatter.format(lastHistory.total) : "--"}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            {growthPercentage !== null ? (
              <>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    growthPercentage >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {growthPercentage >= 0 ? "▲" : "▼"} {growthPercentage.toFixed(1)}%
                </span>
                vs. mes anterior
              </>
            ) : (
              "Necesitamos dos meses para calcular la variacion."
            )}
          </p>
        </article>

        <article className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Proximo mes</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {nextPrediction ? currencyFormatter.format(nextPrediction.total) : "--"}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Prediccion generada automaticamente para el siguiente periodo mensual.
          </p>
        </article>

        <article className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">Entrenamiento</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li className="flex items-center justify-between">
              <span>Muestras utilizadas</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.samples ?? "--"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Facturas procesadas</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.invoice_count ?? "--"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Productos considerados</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.product_count ?? "--"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Categorias analizadas</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.category_count ?? "--"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Cobertura</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.period_from && predictionsMetadata?.period_to
                  ? `${predictionsMetadata.period_from} - ${predictionsMetadata.period_to}`
                  : "--"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Ultimo entrenamiento</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.trained_at
                  ? new Date(predictionsMetadata.trained_at).toLocaleString("es-MX")
                  : "Automatico"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Ultima generacion</span>
              <span className="font-semibold text-gray-900">
                {predictionsMetadata?.generated_at
                  ? new Date(predictionsMetadata.generated_at).toLocaleString("es-MX")
                  : "Reciente"}
              </span>
            </li>
          </ul>
        </article>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Historico vs prediccion mensual
            </h2>
            <p className="text-sm text-gray-500">
              Compara la serie historica de facturacion contra la proyeccion generada por el modelo.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Brain size={14} />
            Random Forest
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            Calculando informacion de ventas...
          </div>
        ) : hasError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            No pudimos cargar los datos de ventas. Intenta nuevamente en unos segundos.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="h-72 rounded-2xl border border-gray-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="historico"
                    stroke={chartColors.actual}
                    strokeWidth={2}
                    name="Historico"
                  />
                  <Line
                    type="monotone"
                    dataKey="prediccion"
                    stroke={chartColors.predicted}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Prediccion"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-72 rounded-2xl border border-gray-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyQuery.data?.by_category ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                  <Bar dataKey="total" fill={chartColors.bar} name="Top categorias" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Proyeccion por categoria prioritaria
            </h2>
            <p className="text-sm text-gray-500">
              Analiza el comportamiento de las categorias con mayor participacion y sus pronosticos
              individuales.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Categorias analizadas: {categoryForecasts.length}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-100"
              />
            ))
          ) : !categoryForecasts.length ? (
            <p className="col-span-full text-sm text-gray-500">
              Aun no tenemos suficiente informacion por categoria. Genera ventas para ver el
              comportamiento del modelo.
            </p>
          ) : (
            categoryForecasts.map((forecast) => {
              const combined = combineSeries(forecast);
              const slug = forecast.category
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "");
              const historicalGradientId = `forecast-${slug}-historico`;
              const predictedGradientId = `forecast-${slug}-prediccion`;
              return (
                <article
                  key={forecast.category}
                  className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Categoria</p>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {forecast.category}
                        </h3>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {forecast.share.toFixed(1)}% share
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Valor proyectado siguiente mes:{" "}
                      <span className="font-semibold text-gray-900">
                        {forecast.predictions.length
                          ? currencyFormatter.format(forecast.predictions[0].total)
                          : "--"}
                      </span>
                    </p>
                  </div>
                  <div className="mt-4 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={combined}>
                        <defs>
                          <linearGradient id={historicalGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.actual} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={chartColors.actual} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={predictedGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.predicted} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={chartColors.predicted} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          formatter={(value: number) => currencyFormatter.format(value)}
                          labelFormatter={(value, tooltipPayload) =>
                            formatPeriodLabel(tooltipPayload?.[0]?.payload?.label ?? value)
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="historico"
                          stroke={chartColors.actual}
                          fill={`url(#${historicalGradientId})`}
                          name="Historico"
                        />
                        <Area
                          type="monotone"
                          dataKey="prediccion"
                          stroke={chartColors.predicted}
                          fill={`url(#${predictedGradientId})`}
                          name="Prediccion"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </section>
  );
}
