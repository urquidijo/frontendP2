import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchBitacoraEntries, type BitacoraEntry } from "../../api";

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "medium",
});

export default function AdminBitacora() {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["bitacora"],
    queryFn: fetchBitacoraEntries,
  });

  const entries = useMemo(() => data ?? [], [data]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Bitacora de operaciones</p>
          <h2 className="text-3xl font-semibold text-gray-900">Seguimiento en tiempo real</h2>
          <p className="text-sm text-gray-500">
            Revisa las acciones recientes sobre usuarios, productos y reportes. Cada registro describe
            exactamente lo que sucedio, quien lo hizo y desde que IP.
          </p>
        </div>
        <span className="text-sm text-gray-500 sm:text-right">
          Los registros se actualizan automaticamente.
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No pudimos cargar la bitacora. Intenta nuevamente.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
          Aun no se registran acciones en la bitacora.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-sm text-gray-700">
              {entries.map((entry) => (
                <BitacoraRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BitacoraRow({ entry }: { entry: BitacoraEntry }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">
        {dateFormatter.format(new Date(entry.creado_en))}
      </td>
      <td className="px-4 py-3">{entry.usuario_username ?? "Anonimo"}</td>
      <td className="px-4 py-3">{entry.accion}</td>
      <td className="px-4 py-3 text-gray-500">{entry.ip_address ?? "N/D"}</td>
    </tr>
  );
}
