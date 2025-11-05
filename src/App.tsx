// ===============================
// App.tsx
// ===============================
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./core/queryClient";
import { Navbar } from "./components/ui";
import { fetchCurrentUser } from "./api";
import { useUserStore } from "./core/store";
import { useCartSync } from "./hooks/useCartSync";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Cart from "./pages/Cart";
import Invoices from "./pages/Invoices";
import Discounts from "./pages/Discounts";

/* ============= Shell que puede leer el location ============= */
function AppShell() {
  const token = useUserStore((s) => s.token);
  const setSession = useUserStore((s) => s.setSession);
  const clearSession = useUserStore((s) => s.clearSession);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useCartSync();

  useEffect(() => {
    if (!token) return;
    let isActive = true;
    fetchCurrentUser()
      .then((user) => {
        if (isActive) setSession(user, token);
      })
      .catch(() => {
        if (isActive) clearSession();
      });
    return () => {
      isActive = false;
    };
  }, [token, setSession, clearSession]);

  return (
    <>
      <Navbar />

      {/* Layout PUBLICO (contenedor centrado, mejor escalado) */}
      {!isAdminRoute && (
        <main className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 2xl:px-14">
          <div className="mx-auto w-full max-w-6xl sm:max-w-7xl 2xl:max-w-[1400px]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/facturas" element={<Invoices />} />
              <Route path="/descuentos" element={<Discounts />} />
              {/* Redirige cualquier otra cosa pública al home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      )}

      {/* Layout ADMIN (full-bleed, sin paddings ni max-width) */}
      {isAdminRoute && (
        <main className="min-h-screen bg-slate-50">
          <Routes>
            <Route path="/admin/*" element={<AdminRoute />} />
            {/* fallback por si escriben mal la ruta admin */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      )}

      {!isAdminRoute && (
        <footer className="px-3 pb-8 pt-6 text-center text-sm text-gray-500 sm:px-6">
          © {new Date().getFullYear()} ElectroStore
        </footer>
      )}
    </>
  );
}

/* ============= Guard de admin ============= */
function AdminRoute() {
  const user = useUserStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if ((user.rol_nombre ?? "").toLowerCase() !== "administrador") {
    return <Navigate to="/" replace />;
  }
  return <Admin />;
}

/* ============= App raíz con BrowserRouter + React Query ============= */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}


