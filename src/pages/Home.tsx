import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchProducts } from "../api";
import type { Product } from "../api";
import { useUserStore } from "../core/store";
import { useCartStore } from "../core/cartStore";
import { ProductCard } from "../components/ProductCard";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clear);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "warning";
    message: string;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsSnapshot = searchParams.toString();
  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (!paymentStatus) return;

    if (paymentStatus === "success") {
      clearCart();
      setPaymentFeedback({
        type: "success",
        message: "Pago procesado correctamente. Gracias por tu compra.",
      });
    } else if (paymentStatus === "cancel") {
      setPaymentFeedback({
        type: "warning",
        message: "El pago fue cancelado. Puedes intentarlo nuevamente cuando gustes.",
      });
    }

    const nextParams = new URLSearchParams(searchParamsSnapshot);
    nextParams.delete("payment");
    setSearchParams(nextParams, { replace: true });

    const timeout = window.setTimeout(() => setPaymentFeedback(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [paymentStatus, clearCart, searchParamsSnapshot, setSearchParams]);

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProducts,
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ["categorias"],
    queryFn: fetchCategories,
  });

  const isLoading = productsLoading || categoriesLoading;
  const hasError = productsError || categoriesError;
  const filteredProducts = useMemo(() => {
    const allProducts = products ?? [];

    if (selectedCategory === null) {
      return allProducts;
    }

    return allProducts.filter(
      (product) => product.categoria?.id === selectedCategory
    );
  }, [products, selectedCategory]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === null) {
      return null;
    }

    return (
      categories?.find((category) => category.id === selectedCategory)?.nombre ??
      null
    );
  }, [categories, selectedCategory]);

  const displayedProducts = filteredProducts;
  const canShowStock = !!user && (user.rol_nombre ?? "").toLowerCase() !== "cliente";

  const handleBuy = (product: Product) => {
    if (!user) {
      navigate("/register");
      return;
    }

    addItem(product);
    navigate("/cart");
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-10">
      {paymentFeedback && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            paymentFeedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-yellow-200 bg-yellow-50 text-yellow-700"
          }`}
        >
          {paymentFeedback.message}
        </div>
      )}
      <header className="rounded-xl bg-white p-6 text-center shadow md:p-8 md:text-left">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
          {user ? "Modo cliente activo" : "Descubre algo nuevo"}
        </p>
        <h1 className="text-3xl font-bold mb-3">
          {user ? `Bienvenido de vuelta, ${user.username}` : "Bienvenido a ElectroStore"}
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto md:mx-0">
          Encuentra la tecnologia que necesitas con ofertas frescas, reseñas claras y una experiencia
          de compra pensada para ti.
        </p>
      </header>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Categorias</h2>
          <p className="text-sm text-gray-500 sm:text-right">
            Selecciona una categoria para filtrar el catalogo.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {!!categories?.length && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm shadow transition ${
                selectedCategory === null
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
              }`}
              aria-pressed={selectedCategory === null}
            >
              Todas
            </button>
          )}
          {categories?.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() =>
                setSelectedCategory((prev) =>
                  prev === category.id ? null : category.id
                )
              }
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm shadow transition ${
                selectedCategory === category.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
              }`}
              aria-pressed={selectedCategory === category.id}
            >
              {category.nombre}
            </button>
          ))}
          {!categories?.length && !isLoading && (
            <p className="text-gray-500 text-sm">
              No hay categorias registradas aun.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Productos</h2>
          {selectedCategoryName ? (
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary sm:self-auto">
              Filtrado por <span className="text-primary/90">{selectedCategoryName}</span>
            </span>
          ) : (
            <span className="self-start text-sm text-gray-500 sm:self-auto sm:text-right">
              Mostrando todas las categorias disponibles.
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse h-64 bg-gray-200 rounded-lg"
              />
            ))}
          </div>
        ) : hasError ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
            No pudimos cargar los productos. Intenta nuevamente.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onBuy={handleBuy}
                showStock={canShowStock}
              />
            ))}
          </div>
        )}

        {!isLoading && !hasError && displayedProducts.length === 0 && (
          <p className="text-gray-500 mt-4">
            {selectedCategory !== null
              ? "No encontramos productos para esta categoria."
              : "Todavia no hay productos registrados en la base de datos."}
          </p>
        )}
      </section>
    </section>
  );
}
