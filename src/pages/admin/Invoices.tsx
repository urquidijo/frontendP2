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
    if (!term) {
      return allInvoices;
    }
    return allInvoices.filter((invoice) => {
      const cliente =
        userLookup.get(invoice.usuario ?? 0)?.toLowerCase() ??
        `usuario #${invoice.usuario ?? "na"}`.toLowerCase();
      return (
        invoice.stripe_invoice_id.toLowerCase().includes(term) || cliente.includes(term)
      );
    });
  }, [invoiceSearch, invoices, userLookup]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Facturas</p>
          <h2 className="text-3xl font-semibold text-gray-900">Historial global</h2>
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
            Los datos se sincronizan automaticamente.
          </span>
        </div>
      </header>

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
            : "Aun no hay facturas registradas."}
        </div>
      ) : (
        <div className="overflow-auto rounded-3xl border border-gray-100 bg-white shadow-sm">
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
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {invoice.stripe_invoice_id}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {userLookup.get(invoice.usuario ?? 0) ??
                      `Usuario #${invoice.usuario ?? "N/A"}`}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {currencyFormatter.format(Number(invoice.amount_total))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(invoice.created_at).toLocaleDateString("es-MX", {
                      dateStyle: "medium",
                    })}
                  </td>
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
      )}
    </section>
  );
}
