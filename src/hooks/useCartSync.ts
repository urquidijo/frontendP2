import { useEffect, useRef } from "react";
import { fetchCurrentCart, syncCart } from "../api";
import { useCartStore } from "../core/cartStore";
import { useUserStore } from "../core/store";

const SYNC_DEBOUNCE_MS = 500;

export function useCartSync() {
  const userId = useUserStore((state) => state.user?.id ?? null);
  const items = useCartStore((state) => state.items);
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      initializedRef.current = false;
      return;
    }
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const serverCart = await fetchCurrentCart();
        if (cancelled) return;
        if (serverCart.detalles?.length) {
          hydrateFromServer(serverCart);
        } else {
          const localItems = useCartStore.getState().items;
          if (localItems.length) {
            const payload = {
              items: localItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
              })),
            };
            const synced = await syncCart(payload);
            if (!cancelled) {
              hydrateFromServer(synced);
            }
          } else {
            hydrateFromServer(serverCart);
          }
        }
      } catch (error) {
        console.warn("No pudimos sincronizar el carrito con el servidor.", error);
      } finally {
        if (!cancelled) {
          initializedRef.current = true;
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId, hydrateFromServer]);

  useEffect(() => {
    if (!userId || !initializedRef.current) return;
    const payload = {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    const timeout = window.setTimeout(() => {
      syncCart(payload).catch((error) =>
        console.warn("No pudimos actualizar el carrito remoto.", error)
      );
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [items, userId]);
}
