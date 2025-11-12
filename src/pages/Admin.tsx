// ===============================
// pages/Admin.tsx (desktop fijo SIN colapsar; móvil con drawer)
// ===============================
import { useState, useMemo } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  FileText,
  History,
  LayoutDashboard,
  Layers,
  Menu,
  Package,
  Percent,
  ShieldCheck,
  TrendingUp,
  Users2,
  X,
} from "lucide-react";
import AdminDashboard from "./admin/Dashboard";
import AdminUsers from "./admin/Users";
import AdminProducts from "./admin/Products";
import AdminCategories from "./admin/Categories";
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
  { id: "dashboard", label: "Inicio", description: "Resumen general", to: "/admin/dashboard", icon: LayoutDashboard },
  { id: "usuarios", label: "Gestion usuario", description: "Crea cuentas y asigna roles", to: "/admin/usuarios", icon: Users2 },
  { id: "productos", label: "Gestion productos", description: "Inventario y precios", to: "/admin/productos", icon: Package },
  { id: "categorias", label: "Categorías", description: "Organiza colecciones", to: "/admin/categorias", icon: Layers },
  { id: "facturas", label: "Facturas", description: "Historial y estados", to: "/admin/facturas", icon: FileText },
  { id: "reportes", label: "Reportes", description: "Consultas dinamicas", to: "/admin/reportes", icon: ShieldCheck },
  { id: "prediccion", label: "Prediccion", description: "Proyecciones de ventas", to: "/admin/prediccion", icon: TrendingUp },
  { id: "descuentos", label: "Descuentos", description: "Gestiona promociones", to: "/admin/descuentos", icon: Percent },
  { id: "bajo-stock", label: "Bajo stock", description: "Productos con stock critico", to: "/admin/bajo-stock", icon: AlertTriangle },
  { id: "bitacora", label: "Bitacora", description: "Registro de acciones clave", to: "/admin/bitacora", icon: History },
];


export default function Admin(){
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false); // SOLO móvil

  const activeId = useMemo(() => {
    const found = adminSections.find(s => location.pathname.startsWith(s.to));
    return found?.id ?? "dashboard";
  }, [location.pathname]);

  function Sidebar(){
    return (
      <aside
        className={[
          "relative h-full w-72 xl:w-80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl",
          "admin-scroll overflow-y-auto",
        ].join(" ")}
        aria-label="Navegación administrativa"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Header del sidebar (sticky) */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-900 to-slate-900/95 px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Dashboard</p>
              <h2 className="mt-0.5 text-lg font-semibold leading-tight">Panel administrativo</h2>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/70">Monitorea usuarios, productos, facturas y genera reportes dinámicos.</p>
        </div>

        {/* Navegación */}
        <nav className="mt-2 space-y-2 px-2 pb-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeId === section.id;
            return (
              <NavLink
                key={section.id}
                to={section.to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive: navActive }) => [
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm outline-none ring-offset-2 ring-offset-slate-900",
                  (isActive || navActive)
                    ? "bg-white text-slate-900 shadow-lg ring-white/0 focus:ring-2"
                    : "bg-white/5 text-white/85 hover:bg-white/10 focus:ring-2 focus:ring-white/30",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={[
                  "grid place-items-center rounded-xl p-2.5",
                  isActive ? "bg-primary/10 text-primary" : "bg-white/10",
                ].join(" ")}>
                  <Icon size={18} />
                </span>

                {/* Etiquetas SIEMPRE visibles en desktop */}
                <span className="flex-1">
                  <p className="font-semibold leading-none">{section.label}</p>
                  <p className="mt-1 text-[11px] text-white/60">{section.description}</p>
                </span>

                {/* Indicador activo (pill) */}
                {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,.25)]" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer pequeño fijo al fondo */}
        <div className="sticky bottom-0 z-10 mt-auto bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent px-3 py-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-[11px] tracking-wide text-white/60">v1.0</span>
            <span className="text-xs text-white/70">Farmacia Admin</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Topbar móvil (solo visible < lg) */}
      <div className="flex items-center justify-between gap-2 border-b bg-white p-3 lg:hidden">
        <button
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 active:scale-[.98]"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>
        <div className="text-sm font-semibold text-slate-700">Panel administrativo</div>
        <div className="w-8" />
      </div>

      <div className="relative flex">
        {/* Sidebar FIJO en desktop (no colapsa) */}
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen">
          <Sidebar />
        </div>

        {/* Drawer móvil */}
        <div
          className={[
            "fixed inset-y-0 left-0 z-50 w-72 xl:w-80 transform bg-slate-900 text-white shadow-2xl transition-transform duration-300 lg:hidden",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-hidden={!drawerOpen}
        >
          <div className="flex items-center justify-between p-3">
            <div className="text-sm font-semibold">Menú</div>
            <button
              aria-label="Cerrar menú"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <Sidebar />
        </div>

        {/* Backdrop del drawer */}
        {drawerOpen && (
          <button
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Contenido */}
        <main className="min-h-screen flex-1">
          <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
            <div className="rounded-3xl border border-gray-100 bg-white px-3 py-5 shadow-sm sm:px-6 lg:px-8">
              <div className="w-full overflow-x-auto lg:overflow-visible">
                <Routes>
                  <Route path="/" element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="usuarios" element={<AdminUsers />} />
                  <Route path="productos" element={<AdminProducts />} />
                  <Route path="categorias" element={<AdminCategories />} />
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
        </main>
      </div>
    </div>
  );
}
