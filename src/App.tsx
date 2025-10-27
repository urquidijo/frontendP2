import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  const token = useUserStore((state) => state.token);
  const setSession = useUserStore((state) => state.setSession);
  const clearSession = useUserStore((state) => state.clearSession);
  useCartSync();

  useEffect(() => {
    if (!token) return;

    let isActive = true;
    fetchCurrentUser()
      .then((user) => {
        if (isActive) {
          setSession(user, token);
        }
      })
      .catch(() => {
        if (isActive) {
          clearSession();
        }
      });

    return () => {
      isActive = false;
    };
  }, [token, setSession, clearSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />

        <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full xl:max-w-7xl">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/facturas" element={<Invoices />} />
              <Route path="/descuentos" element={<Discounts />} />
              <Route path="/admin/*" element={<AdminRoute />} />
            </Routes>
          </div>
        </main>

        <footer className="px-4 pb-8 pt-6 text-center text-sm text-gray-500 sm:px-6">
          © {new Date().getFullYear()} ElectroStore
        </footer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AdminRoute() {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((user.rol_nombre ?? "").toLowerCase() !== "administrador") {
    return <Navigate to="/" replace />;
  }

  return <Admin />;
}
