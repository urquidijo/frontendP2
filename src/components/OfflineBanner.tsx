import { useEffect, useState } from "react";

const classes =
  "fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md md:text-base";

export function OfflineBanner() {
  const [isOffline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (typeof document !== "undefined") {
        document.body.style.paddingTop = "";
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.paddingTop = isOffline ? "3.5rem" : "";
    }
  }, [isOffline]);

  if (!isOffline) {
    return null;
  }

  return (
    <div className={classes}>
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-slate-900" />
      Sin conexion: puedes seguir navegando con los datos guardados y se sincronizara al volver.
    </div>
  );
}
