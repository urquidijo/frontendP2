import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic } from "lucide-react";
import {
  generateReport,
  type ReportFormat,
  type ReportScreenResponse,
  type ReportPromptPayload,
} from "../../api";
import { currencyFormatter } from "./shared";
import { useSpeechToText } from "../../hooks/useSpeechToText";

export default function AdminReports() {
  const [reportPrompt, setReportPrompt] = useState("");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("screen");
  const [reportChannel, setReportChannel] = useState<ReportPromptPayload["channel"]>("texto");
  const [reportResult, setReportResult] = useState<ReportScreenResponse | null>(null);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const reportMutation = useMutation({
    mutationFn: generateReport,
    onMutate: () => setReportFeedback(null),
    onSuccess: (response) => {
      if ("rows" in response) {
        setReportResult(response);
        setReportFeedback("Reporte generado en pantalla.");
        return;
      }
      const url = URL.createObjectURL(response.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 250);
      setReportFeedback(`Reporte descargado como ${response.filename}.`);
    },
    onError: () => setReportFeedback("No pudimos generar el reporte. Intenta nuevamente."),
  });

  const handleReportSubmit = () => {
    if (!reportPrompt.trim()) {
      setReportFeedback("Describe el reporte que necesitas.");
      return;
    }

    reportMutation.mutate({
      prompt: reportPrompt,
      format: reportFormat,
      channel: reportChannel,
    });
  };

  const {
    isSupported: reportVoiceSupported,
    isListening: reportVoiceListening,
    startListening: startReportListening,
    stopListening: stopReportListening,
  } = useSpeechToText({
    onResult: (text) => {
      setReportPrompt(text);
      setReportChannel("voz");
    },
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Reportes dinamicos</p>
          <h2 className="text-3xl font-semibold text-gray-900">
            Genera informes con texto o voz
          </h2>
          <p className="text-sm text-gray-500">
            Describe el filtro que necesitas y obten resultados en pantalla, PDF o Excel.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            reportVoiceListening ? stopReportListening() : startReportListening()
          }
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            reportVoiceListening ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
          }`}
          disabled={!reportVoiceSupported}
        >
          <Mic size={16} />
          {reportVoiceSupported
            ? reportVoiceListening
              ? "Detener voz"
              : "Dictar prompt"
            : "Voz no disponible"}
        </button>
      </header>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <textarea
          value={reportPrompt}
          onChange={(event) => {
            setReportPrompt(event.target.value);
            setReportChannel("texto");
          }}
          placeholder='Ejemplo: "Quiero un reporte en Excel de ventas del 01/10/2024 al 01/01/2025 agrupado por cliente."'
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          rows={3}
        />

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format-screen"
              value="screen"
              checked={reportFormat === "screen"}
              onChange={() => setReportFormat("screen")}
            />
            Mostrar en pantalla
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format-screen"
              value="pdf"
              checked={reportFormat === "pdf"}
              onChange={() => setReportFormat("pdf")}
            />
            Descargar PDF
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format-screen"
              value="excel"
              checked={reportFormat === "excel"}
              onChange={() => setReportFormat("excel")}
            />
            Descargar Excel
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReportSubmit}
            disabled={reportMutation.isPending}
            className="rounded-2xl bg-primary px-5 py-2 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {reportMutation.isPending ? "Generando..." : "Generar reporte"}
          </button>
          {reportFeedback && <span className="text-sm text-gray-600">{reportFeedback}</span>}
        </div>
      </div>

      {reportFormat === "screen" && reportResult && (
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              Periodo:{" "}
              <span className="font-semibold text-gray-900">
                {reportResult.metadata.start_date} - {reportResult.metadata.end_date}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Agrupado por:{" "}
              <span className="font-semibold text-gray-900">
                {reportResult.metadata.group_by}
              </span>
            </p>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            {reportResult.summary.slice(0, 3).map((entry) => (
              <div key={entry.label} className="rounded-2xl bg-gray-50 p-4 text-sm">
                <p className="font-semibold text-gray-800">{entry.label}</p>
                <p className="text-gray-500">
                  {entry.cantidad} unidades - {currencyFormatter.format(entry.monto_total)}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-auto rounded-b-3xl">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Factura</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Cantidad</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportResult.rows.slice(0, 20).map((row) => (
                  <tr key={`${row.factura}-${row.producto}-${row.fecha}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.factura}</td>
                    <td className="px-4 py-3 text-gray-600">{row.cliente}</td>
                    <td className="px-4 py-3 text-gray-600">{row.producto}</td>
                    <td className="px-4 py-3 text-gray-600">{row.cantidad}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(row.monto_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
