import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  FileText,
  History,
  LayoutDashboard,
  Package,
  Percent,
  ShieldCheck,
  TrendingUp,
  Users2,
} from "lucide-react";
import AdminDashboard from "./admin/Dashboard";
import AdminUsers from "./admin/Users";
import AdminProducts from "./admin/Products";
import AdminInvoices from "./admin/Invoices";
import AdminReports from "./admin/Reports";
import AdminSalesForecast from "./admin/SalesForecast";
import AdminDiscounts from "./admin/Discounts";
import AdminLowStock from "./admin/LowStock";
import AdminBitacora from "./admin/Bitacora";

interface AdminSection {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

const adminSections: AdminSection[] = [
  {
    id: "dashboard",
    label: "Inicio",
    description: "Resumen general",
    to: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "usuarios",
    label: "Gestion usuario",
    description: "Crea cuentas y asigna roles",
    to: "/admin/usuarios",
    icon: Users2,
  },
  {
    id: "productos",
    label: "Gestion productos",
    description: "Inventario y precios",
    to: "/admin/productos",
    icon: Package,
  },
  {
    id: "facturas",
    label: "Facturas",
    description: "Historial y estados",
    to: "/admin/facturas",
    icon: FileText,
  },
  {
    id: "reportes",
    label: "Reportes",
    description: "Consultas dinamicas",
    to: "/admin/reportes",
    icon: ShieldCheck,
  },
  {
    id: "prediccion",
    label: "Prediccion",
    description: "Proyecciones de ventas",
    to: "/admin/prediccion",
    icon: TrendingUp,
  },
  {
    id: "descuentos",
    label: "Descuentos",
    description: "Gestiona promociones",
    to: "/admin/descuentos",
    icon: Percent,
  },
  {
    id: "bajo-stock",
    label: "Bajo stock",
    description: "Productos con stock critico",
    to: "/admin/bajo-stock",
    icon: AlertTriangle,
  },
  {
    id: "bitacora",
    label: "Bitacora",
    description: "Registro de acciones clave",
    to: "/admin/bitacora",
    icon: History,
  },
];

export default function Admin() {
  const location = useLocation();

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid min-w-[520px] gap-6 [grid-template-columns:200px_minmax(0,1fr)] sm:min-w-[620px] sm:[grid-template-columns:220px_minmax(0,1fr)] lg:min-w-0 lg:[grid-template-columns:260px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/60">Dashboard</p>
            <h2 className="text-2xl font-semibold">Panel administrativo</h2>
            <p className="text-sm text-white/70">
              Monitorea usuarios, productos, facturas y genera reportes dinamicos.
            </p>
          </div>

          <nav className="mt-8 space-y-3">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const isActive = location.pathname.startsWith(section.to);
              return (
                <NavLink
                  key={section.id}
                  to={section.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-white text-slate-900 shadow-lg"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`rounded-xl p-2 ${
                      isActive ? "bg-primary/10 text-primary" : "bg-white/10"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="flex-1">
                    <p className="font-semibold">{section.label}</p>
                    <p className={`text-xs ${isActive ? "text-slate-500" : "text-white/60"}`}>
                      {section.description}
                    </p>
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 rounded-3xl border border-gray-100 bg-white px-4 py-6 shadow-sm sm:px-6">
          <div className="w-full overflow-x-auto lg:overflow-visible">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="facturas" element={<AdminInvoices />} />
              <Route path="reportes" element={<AdminReports />} />
              <Route path="prediccion" element={<AdminSalesForecast />} />
              <Route path="descuentos" element={<AdminDiscounts />} />
              <Route path="bajo-stock" element={<AdminLowStock />} />
              <Route path="bitacora" element={<AdminBitacora />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
