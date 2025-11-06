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
      {/* Header responsive */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Bitácora de operaciones</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Seguimiento en tiempo real</h2>
          <p className="text-sm text-gray-500">
            Revisa las acciones recientes sobre usuarios, productos y reportes. Cada registro describe
            exactamente lo que sucedió, quién lo hizo y desde qué IP.
          </p>
        </div>
        <span className="text-sm text-gray-500 sm:text-right">Los registros se actualizan automáticamente.</span>
      </header>

      {/* Loading / Error / Empty */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No pudimos cargar la bitácora. Intenta nuevamente.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
          Aún no se registran acciones en la bitácora.
        </div>
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white">
          {/* Tabla en ≥ md */}
          <div className="hidden md:block overflow-auto rounded-2xl">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                {entries.map((entry) => (
                  <BitacoraRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista tipo tarjeta en < md */}
          <ul className="md:hidden divide-y divide-gray-100">
            {entries.map((entry) => (
              <BitacoraCard key={entry.id} entry={entry} />)
            )}
          </ul>
        </section>
      )}
    </section>
  );
}

function BitacoraRow({ entry }: { entry: BitacoraEntry }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
        {dateFormatter.format(new Date(entry.creado_en))}
      </td>
      <td className="px-4 py-3 max-w-[240px]">
        <span className="block truncate" title={entry.usuario_username ?? "Anónimo"}>
          {entry.usuario_username ?? "Anónimo"}
        </span>
      </td>
      <td className="px-4 py-3 max-w-[520px]">
        <span className="block truncate" title={entry.accion}>
          {entry.accion}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{entry.ip_address ?? "N/D"}</td>
    </tr>
  );
}

function BitacoraCard({ entry }: { entry: BitacoraEntry }) {
  const fecha = dateFormatter.format(new Date(entry.creado_en));
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-400">Fecha</p>
          <p className="font-medium text-gray-900">{fecha}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
          {entry.ip_address ?? "N/D"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-400">Usuario</p>
          <p className="truncate text-gray-700" title={entry.usuario_username ?? "Anónimo"}>
            {entry.usuario_username ?? "Anónimo"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Acción</p>
          <p className="text-gray-700 break-words">{entry.accion}</p>
        </div>
      </div>
    </li>
  );
}
