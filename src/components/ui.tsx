import { useEffect, useState } from "react";
import { LogOut, Menu, ShoppingCart, User, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../core/store";
import { useCartStore } from "../core/cartStore";
import { logoutUser } from "../api";

export function Navbar() {
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const clearSession = useUserStore((state) => state.clearSession);
  const cartCount = useCartStore((state) => state.totalItems());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error("No se pudo registrar el logout en el servidor.", error);
    } finally {
      clearSession();
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const isAdmin = (user?.rol_nombre ?? "").toLowerCase() === "administrador";

  return (
    <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="text-xl font-bold text-primary">
          ElectroStore
        </Link>

        <div className="flex items-center gap-3 lg:hidden">
          <Link
            to="/cart"
            className="relative rounded-full border border-gray-200 p-2 text-gray-600 transition hover:border-primary hover:text-primary"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-600 transition hover:border-primary hover:text-primary"
            aria-label={isMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="hidden items-center gap-6 lg:flex">
          {user ? (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {user.rol_nombre ?? "Cliente"}
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-800">
                  <User size={18} /> {user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Saliendo..." : "Salir"}
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1 text-gray-700 transition hover:text-primary"
              >
                <User size={20} /> Ingresar
              </Link>
              <Link to="/register" className="text-gray-700 transition hover:text-primary">
                Crear cuenta
              </Link>
            </>
          )}
          <Link to="/facturas" className="text-gray-700 transition hover:text-primary">
            Facturas
          </Link>
          <Link to="/descuentos" className="text-gray-700 transition hover:text-primary">
            Descuentos
          </Link>
          <Link
            to="/cart"
            className="relative flex items-center gap-1 text-gray-700 transition hover:text-primary"
          >
            <ShoppingCart size={20} />
            <span>Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-primary px-1 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-gray-700 transition hover:text-primary">
              Panel
            </Link>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-gray-100 bg-white lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
            {user ? (
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {user.rol_nombre ?? "Cliente"}
                </p>
                <p className="mt-1 flex items-center gap-2 font-semibold text-gray-800">
                  <User size={18} /> {user.username}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {isLoggingOut ? "Saliendo..." : "Cerrar sesion"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-primary hover:text-primary"
                >
                  <span>Ingresar</span>
                  <User size={18} />
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                >
                  <span>Crear cuenta</span>
                </Link>
              </div>
            )}

            <nav className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              <Link
                to="/facturas"
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary hover:text-primary"
              >
                <span>Facturas</span>
              </Link>
              <Link
                to="/descuentos"
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary hover:text-primary"
              >
                <span>Descuentos</span>
              </Link>
              <Link
                to="/cart"
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary hover:text-primary"
              >
                <span>Carrito</span>
                {cartCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary hover:text-primary"
                >
                  <span>Panel administrativo</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
