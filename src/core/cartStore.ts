import { create } from "zustand";
import type { Product, CartResponse } from "../api";
import { getProductEffectivePrice } from "../api";

const CART_STORAGE_KEY = "electrostore-cart";
const CART_EXPIRATION_MS = 60 * 60 * 1000;

export interface CartItem {
  product: Product;
  quantity: number;
}

const loadStoredItems = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: CartItem[]; timestamp?: number };
    if (!parsed.items || !Array.isArray(parsed.items)) return [];
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CART_EXPIRATION_MS) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return parsed.items;
  } catch (error) {
    console.warn("No pudimos restaurar el carrito almacenado.", error);
    return [];
  }
};

const persistItems = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items, timestamp: Date.now() })
    );
  } catch (error) {
    console.warn("No pudimos guardar el carrito localmente.", error);
  }
};

interface CartState {
  items: CartItem[];
  hydrateFromServer: (cart: CartResponse) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  clear: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

const mapCartResponseToItems = (cart: CartResponse): CartItem[] =>
  (cart.detalles ?? []).map((detail) => ({
    product: detail.producto,
    quantity: detail.cantidad,
  }));

export const useCartStore = create<CartState>((set, get) => ({
  items: loadStoredItems(),
  hydrateFromServer: (cart) => {
    const mapped = mapCartResponseToItems(cart);
    set({ items: mapped });
    persistItems(mapped);
  },
  setItems: (items) => {
    set({ items });
    persistItems(items);
  },
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id);
      const updated = existing
        ? state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...state.items, { product, quantity: 1 }];
      persistItems(updated);
      return { items: updated };
    }),
  removeItem: (productId) =>
    set((state) => {
      const updated = state.items.filter((item) => item.product.id !== productId);
      persistItems(updated);
      return { items: updated };
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => {
      const normalized = Math.max(1, quantity);
      const updated = state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity: normalized } : item
      );
      persistItems(updated);
      return { items: updated };
    }),
  clear: () => {
    persistItems([]);
    set({ items: [] });
  },
  totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
  totalAmount: () =>
    get().items.reduce(
      (total, item) => total + getProductEffectivePrice(item.product) * item.quantity,
      0
    ),
}));
