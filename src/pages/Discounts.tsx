import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveDiscounts } from "../api";
import { ProductCard } from "../components/ProductCard";
import { useCartStore } from "../core/cartStore";

export default function Discounts() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  const discountsQuery = useQuery({
    queryKey: ["descuentos-activos"],
    queryFn: fetchActiveDiscounts,
  });

  const discountedProducts = useMemo(
    () => discountsQuery.data?.map((entry) => entry.producto) ?? [],
    [discountsQuery.data]
  );

  const handleBuy = (product: (typeof discountedProducts)[number]) => {
    addItem(product);
    navigate("/cart");
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-3xl font-semibold text-gray-900">Ofertas y descuentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Descubre los productos con promociones activas. Cada descuento tiene una vigencia definida,
          asi que aprovéchalos antes de que terminen.
        </p>
      </header>

      {discountsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : discountsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          No pudimos cargar los descuentos en este momento. Intenta nuevamente en unos segundos.
        </div>
      ) : discountedProducts.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
          Actualmente no hay productos en promocion. Vuelve mas tarde para descubrir nuevas ofertas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {discountedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onBuy={handleBuy} />
          ))}
        </div>
      )}
    </section>
  );
}
