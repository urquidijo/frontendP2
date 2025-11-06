import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, ShoppingCart, User, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../core/store";
import { useCartStore } from "../core/cartStore";
import { logoutUser } from "../api";

/* ======================= helpers ======================= */
function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** Deriva iniciales a partir de name/email/username */
function getInitials(raw?: string | null) {
  const s = (raw || "").trim();
  if (!s) return "?";
  // separar por espacios o símbolos
  const parts = s
    .replace(/[_.-]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || "");
  return (first + last).toUpperCase();
}

/** Paleta cerrada (whitelisted para Tailwind) y hash determinístico */
const AVATAR_BG = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-violet-500",
];
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function avatarColorKey(name: string) {
  const idx = hash(name) % AVATAR_BG.length;
  return AVATAR_BG[idx];
}

/* ======================= component ======================= */
export function Navbar() {
  const location = useLocation();
  const pathname = location.pathname;
  const scrolled = useScrolled(2);

  const user = useUserStore((s) => s.user);
  const clearSession = useUserStore((s) => s.clearSession);
  const cartCount = useCartStore((s) => s.totalItems());

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = (user?.rol_nombre ?? "").toLowerCase() === "administrador";

  // Cerrar mobile-menu / dropdown al cambiar de ruta
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserOpen(false);
  }, [pathname]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setIsUserOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ESC para cerrar menús
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsUserOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error("No se pudo registrar el logout en el servidor.", err);
    } finally {
      clearSession();
      setIsLoggingOut(false);
      setIsMenuOpen(false);
      setIsUserOpen(false);
    }
  };

  const NavLinkItem = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const active = pathname === to || (to !== "/" && pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={cx(
          "relative rounded-xl px-3 py-2 text-sm font-medium transition",
          "outline-none ring-offset-2 focus:ring-2 focus:ring-primary/40",
          active ? "text-primary bg-primary/5" : "text-gray-700 hover:text-primary hover:bg-primary/5"
        )}
      >
        {children}
        {active && <span className="absolute inset-x-2 -bottom-[6px] h-[2px] rounded-full bg-primary/70" />}
      </Link>
    );
  };

  // datos para avatar
  const displayName = user?.username || user?.email || "Usuario";
  const initials = getInitials(displayName);
  const avatarBg = avatarColorKey(displayName);
  const avatarUrl = (user as any)?.avatar_url || (user as any)?.photoURL || (user as any)?.avatar;

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b border-gray-100/80",
        "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/55",
        scrolled ? "shadow-sm" : ""
      )}
      role="banner"
    >
      {/* Top line accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/70" />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Ir al inicio"
        >
          <div className="h-8 w-8 rounded-xl bg-primary text-white grid place-items-center font-bold">E</div>
          <span className="text-lg font-extrabold tracking-tight text-gray-900">
            Electro<span className="text-primary group-hover:opacity-90">Store</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          <NavLinkItem to="/facturas">Facturas</NavLinkItem>
          <NavLinkItem to="/descuentos">Descuentos</NavLinkItem>
          <NavLinkItem to="/cart">
            <span className="inline-flex items-center gap-2">
              <ShoppingCart size={18} />
              Carrito
              {cartCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </span>
          </NavLinkItem>
          {isAdmin && <NavLinkItem to="/admin">Panel</NavLinkItem>}
        </nav>

        {/* Right side (desktop) */}
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserOpen((v) => !v)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1 pr-3 py-1.5 text-sm font-semibold text-gray-700",
                  "hover:border-primary hover:text-primary transition",
                  "outline-none focus:ring-2 focus:ring-primary/40"
                )}
                aria-expanded={isUserOpen}
                aria-haspopup="menu"
              >
                {/* Avatar con fallback */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className={cx(
                      "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold uppercase text-white",
                      avatarBg
                    )}
                    aria-hidden
                  >
                    {initials}
                  </span>
                )}
                <span className="hidden sm:inline max-w-[12ch] truncate">{displayName}</span>
                <ChevronDown size={16} className={cx("transition", isUserOpen ? "rotate-180" : "")} />
              </button>

              {/* Dropdown */}
              <div
                className={cx(
                  "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 transition",
                  isUserOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
                )}
                role="menu"
                aria-label="Menú de usuario"
              >
                {/* Header del usuario */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-9 w-9 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className={cx("grid h-9 w-9 place-items-center rounded-full text-xs font-bold uppercase text-white", avatarBg)}>
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">{user.rol_nombre ?? "Cliente"}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex flex-col p-1">
                  <Link
                    to="/facturas"
                    role="menuitem"
                    className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                  >
                    Mis facturas
                  </Link>
                  <Link
                    to="/descuentos"
                    role="menuitem"
                    className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                  >
                    Promociones
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      role="menuitem"
                      className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                    >
                      Panel administrativo
                    </Link>
                  )}
                </div>
                <div className="h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  role="menuitem"
                  className={cx(
                    "m-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                    "border border-gray-200 text-gray-700 hover:border-primary hover:text-primary",
                    "disabled:opacity-60"
                  )}
                >
                  <LogOut size={16} />
                  {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                  "text-gray-700 hover:text-primary hover:bg-primary/5",
                  "outline-none focus:ring-2 focus:ring-primary/40"
                )}
              >
                <User size={18} />
                Ingresar
              </Link>
              <Link
                to="/register"
                className={cx(
                  "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white",
                  "hover:bg-primary/90 outline-none focus:ring-2 focus:ring-primary/40"
                )}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        {/* Right side (mobile) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/cart"
            className={cx(
              "relative inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-700",
              "hover:border-primary hover:text-primary transition",
              "outline-none focus:ring-2 focus:ring-primary/40"
            )}
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className={cx(
              "inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-700",
              "hover:border-primary hover:text-primary transition",
              "outline-none focus:ring-2 focus:ring-primary/40"
            )}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cx(
          "lg:hidden overflow-hidden border-t border-gray-100 bg-white transition-[max-height,opacity] duration-300",
          isMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {/* Perfil / sesión */}
          {user ? (
            <div className="mb-4 rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-9 w-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className={cx("grid h-9 w-9 place-items-center rounded-full text-xs font-bold uppercase text-white", avatarBg)}>
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{displayName}</p>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{user.rol_nombre ?? "Cliente"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={cx(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2",
                  "text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary",
                  "disabled:opacity-60"
                )}
              >
                <LogOut size={16} />
                {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
              </button>
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary"
              >
                <User size={18} /> Ingresar
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                Crear cuenta
              </Link>
            </div>
          )}

          {/* Navegación */}
          <nav className="flex flex-col gap-2 text-sm font-medium text-gray-700" aria-label="Navegación móvil">
            <Link
              to="/facturas"
              className={cx(
                "rounded-xl border px-4 py-3",
                pathname.startsWith("/facturas")
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 hover:border-primary hover:text-primary"
              )}
            >
              Facturas
            </Link>
            <Link
              to="/descuentos"
              className={cx(
                "rounded-xl border px-4 py-3",
                pathname.startsWith("/descuentos")
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 hover:border-primary hover:text-primary"
              )}
            >
              Descuentos
            </Link>
            <Link
              to="/cart"
              className={cx(
                "flex items-center justify-between rounded-xl border px-4 py-3",
                pathname.startsWith("/cart")
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 hover:border-primary hover:text-primary"
              )}
            >
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{cartCount}</span>
              )}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={cx(
                  "rounded-xl border px-4 py-3",
                  pathname.startsWith("/admin")
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-100 hover:border-primary hover:text-primary"
                )}
              >
                Panel administrativo
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
