import type { Product } from "../api";
import { getProductEffectivePrice } from "../api";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const fallbackImage =
  "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=600&q=80";

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
  showStock?: boolean;
}

export function ProductCard({ product, onBuy, showStock = false }: ProductCardProps) {
  const discount = product.active_discount;
  const hasDiscount = Boolean(discount?.esta_activo);
  const effectivePrice = getProductEffectivePrice(product);
  const discountedPrice = hasDiscount ? effectivePrice : null;
  const originalPrice = Number(discount?.precio_original ?? product.precio);
  const percentageLabel = hasDiscount
    ? Math.round(Number(discount?.porcentaje ?? 0)).toString()
    : null;

  return (
    <div className="relative flex flex-col rounded-lg border bg-white p-4 shadow transition hover:shadow-lg">
      {hasDiscount && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 shadow">
          -{percentageLabel}%
        </span>
      )}
      <img
        src={product.imagen || fallbackImage}
        alt={product.nombre}
        className="mb-3 h-40 w-full rounded-md object-cover"
        loading="lazy"
      />
      <h2 className="text-lg font-semibold text-gray-800">{product.nombre}</h2>
      <p className="flex-1 text-sm text-gray-500">{product.descripcion || "Sin descripcion"}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {hasDiscount ? (
            <>
              <span className="text-xs text-gray-400 line-through">
                {priceFormatter.format(originalPrice)}
              </span>
              <span className="text-lg font-semibold text-primary">
                {priceFormatter.format(discountedPrice ?? originalPrice)}
              </span>
            </>
          ) : (
            <span className="text-primary font-semibold">
              {priceFormatter.format(Number(product.precio))}
            </span>
          )}
        </div>
        {showStock && (
          <span className="text-xs text-gray-500">
            Stock: {product.stock}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onBuy(product)}
        className="mt-4 w-full rounded-lg bg-primary py-2 font-medium text-white transition hover:bg-sky-600"
      >
        Comprar
      </button>
    </div>
  );
}
