import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllInvoices, fetchUsers, type Invoice } from "../../api";
import { currencyFormatter, StatusPill } from "./shared";

export default function AdminInvoices() {
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useQuery({
    queryKey: ["facturas-admin"],
    queryFn: fetchAllInvoices,
  });

  const usersQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsers,
  });

  const userLookup = useMemo(() => {
    const map = new Map<number, string>();
    (usersQuery.data ?? []).forEach((user) => map.set(user.id, user.username));
    return map;
  }, [usersQuery.data]);

  const filteredInvoices = useMemo(() => {
    const term = invoiceSearch.trim().toLowerCase();
    const allInvoices = invoices ?? [];
    if (!term) return allInvoices;
    return allInvoices.filter((invoice) => {
      const cliente =
        userLookup.get(invoice.usuario ?? 0)?.toLowerCase() ??
        `usuario #${invoice.usuario ?? "na"}`.toLowerCase();
      return (
        invoice.stripe_invoice_id.toLowerCase().includes(term) || cliente.includes(term)
      );
    });
  }, [invoiceSearch, invoices, userLookup]);

  const formatDate = (value: string | Date) =>
    new Date(value).toLocaleDateString("es-MX", { dateStyle: "medium" });

  return (
    <section className="space-y-6">
      {/* Header responsive */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Facturas</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Historial global</h2>
          <p className="text-sm text-gray-500">
            Visualiza todas las facturas emitidas a tus clientes y su estado en Stripe.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:justify-end">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(event) => setInvoiceSearch(event.target.value)}
            placeholder="Buscar por cliente o factura"
            className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none sm:max-w-xs"
          />
          <span className="text-sm text-gray-500 sm:text-right">
            Los datos se sincronizan automáticamente.
          </span>
        </div>
      </header>

      {/* Estados */}
      {invoicesLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-gray-500">Cargando facturas...</p>
        </div>
      ) : invoicesError ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No pudimos obtener las facturas. Intenta nuevamente.
        </div>
      ) : !filteredInvoices.length ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
          {invoiceSearch.trim()
            ? "No encontramos facturas con ese criterio."
            : "Aún no hay facturas registradas."}
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          {/* Tabla en ≥ md */}
          <div className="hidden md:block overflow-auto rounded-3xl">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Factura</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Total</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredInvoices.map((invoice: Invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="inline-block max-w-[200px] truncate align-bottom" title={invoice.stripe_invoice_id}>
                        {invoice.stripe_invoice_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="inline-block max-w-[220px] truncate align-bottom" title={userLookup.get(invoice.usuario ?? 0) ?? `Usuario #${invoice.usuario ?? "N/A"}`}>
                        {userLookup.get(invoice.usuario ?? 0) ?? `Usuario #${invoice.usuario ?? "N/A"}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(Number(invoice.amount_total))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(invoice.created_at)}</td>
                    <td className="px-4 py-3">
                      {invoice.hosted_invoice_url ? (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sin enlace</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista tipo tarjeta en < md */}
          <ul className="md:hidden divide-y divide-gray-100">
            {filteredInvoices.map((invoice: Invoice) => {
              const cliente = userLookup.get(invoice.usuario ?? 0) ?? `Usuario #${invoice.usuario ?? "N/A"}`;
              return (
                <li key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Factura</p>
                      <p className="truncate font-semibold text-gray-900" title={invoice.stripe_invoice_id}>
                        {invoice.stripe_invoice_id}
                      </p>
                    </div>
                    <StatusPill status={invoice.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-gray-400">Cliente</p>
                      <p className="truncate text-gray-700" title={cliente}>{cliente}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                      <p className="font-medium text-gray-900">{currencyFormatter.format(Number(invoice.amount_total))}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Fecha</p>
                      <p className="text-gray-700">{formatDate(invoice.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Enlace</p>
                      {invoice.hosted_invoice_url ? (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver factura
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sin enlace</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
