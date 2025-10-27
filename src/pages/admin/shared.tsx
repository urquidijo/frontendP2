import type { JSX } from "react";

export const numberFormatter = new Intl.NumberFormat("en-US");

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusStyles: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border border-green-200",
  draft: "bg-gray-100 text-gray-600 border border-gray-200",
  open: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

export function StatusPill({ status }: { status: string }): JSX.Element {
  return (
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
        statusStyles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export const chartColors = {
  actual: "#0ea5e9",
  predicted: "#93c5fd",
  bar: "#0ea5e9",
};
