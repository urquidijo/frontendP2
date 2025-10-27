import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoices } from "../api";
import { useUserStore } from "../core/store";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Invoices() {
  const user = useUserStore((state) => state.user);

  const invoicesQuery = useQuery({
    queryKey: ["facturas", user?.id],
    queryFn: () => fetchInvoices(user!.id),
    enabled: Boolean(user),
  });

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);

  if (!user) {
    return (
      <section className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6 space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Facturas</h1>
        <p className="text-gray-500">
          Necesitas iniciar sesion para revisar el historial de pagos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-sky-600 transition"
          >
            Crear cuenta
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-sky-50 transition"
          >
            Ingresar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Facturas</h1>
          <p className="text-gray-500">Resumen de tus compras procesadas con Stripe.</p>
        </div>
        <span className="text-sm text-gray-500">
          Se sincronizan automaticamente cuando hay nuevas compras.
        </span>
      </div>

      {invoicesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow h-24 animate-pulse" />
          ))}
        </div>
      ) : invoicesQuery.isError ? (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-600">
          No pudimos cargar tus facturas. Intenta nuevamente.
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Aun no registramos pagos para tu cuenta.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <article
              key={invoice.id}
              className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-lg">
                  Factura {invoice.stripe_invoice_id || `#${invoice.id}`}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(invoice.created_at).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              <div className="text-center">
                <p className="text-xl font-semibold">
                  {priceFormatter.format(Number(invoice.amount_total))}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    invoice.status === "paid"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>

              {invoice.hosted_invoice_url && (
                <a
                  href={invoice.hosted_invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline text-center"
                >
                  Ver factura en Stripe
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
