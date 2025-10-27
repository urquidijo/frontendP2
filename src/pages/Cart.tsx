import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createCheckoutSession, fetchProducts, getProductEffectivePrice } from "../api";
import { useCartStore } from "../core/cartStore";
import { useUserStore } from "../core/store";
import { useSpeechToText } from "../hooks/useSpeechToText";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Cart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const totalAmount = useCartStore((state) => state.totalAmount());
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const [commandInput, setCommandInput] = useState("");
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const { data: catalog } = useQuery({
    queryKey: ["productos-cart"],
    queryFn: fetchProducts,
  });

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const cartSummary = useMemo(
    () =>
      items.map((item) => {
        const unitPrice = getProductEffectivePrice(item.product);
        const originalPrice = Number(
          item.product.active_discount?.precio_original ?? item.product.precio
        );
        const hasDiscount = Boolean(item.product.active_discount?.esta_activo);
        return {
          ...item,
          unitPrice,
          originalPrice,
          hasDiscount,
          total: unitPrice * item.quantity,
        };
      }),
    [items]
  );

  const handleCheckout = () => {
    if (!user) {
      navigate("/register");
      return;
    }

    if (!items.length || checkoutMutation.isPending) return;

    checkoutMutation.mutate({
      usuarioId: user.id,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      successUrl: `${window.location.origin}/?payment=success`,
      cancelUrl: `${window.location.origin}/?payment=cancel`,
    });
  };

  const findProductByCommand = useCallback(
    (command: string) => {
      if (!catalog) return null;
      const normalized = command.toLowerCase();
      return (
        catalog.find((product) =>
          product.nombre.toLowerCase().includes(normalized)
        ) ?? null
      );
    },
    [catalog]
  );

  const interpretCommand = useCallback(
    (instruction: string, fromVoice = false) => {
      if (!instruction.trim()) return;
      if (!catalog?.length) {
        setCommandFeedback("Aun estamos cargando el catalogo. Intenta en unos segundos.");
        return;
      }

      const normalized = instruction.toLowerCase();
      const quantityMatch = normalized.match(/(\d+)/);
      const quantity = quantityMatch ? Math.max(1, Number(quantityMatch[1])) : 1;

      if (normalized.includes("agregar") || normalized.includes("añadir") || normalized.includes("anadir")) {
        const productName = normalized
          .replace("agregar", "")
          .replace("añadir", "")
          .replace("anadir", "")
          .replace(String(quantityMatch?.[0] ?? ""), "")
          .trim();
        if (!productName) {
          setCommandFeedback("Necesito el nombre del producto que deseas agregar.");
          return;
        }
        const product = findProductByCommand(productName);
        if (!product) {
          setCommandFeedback("No pude encontrar ese producto.");
          return;
        }

        const existing = items.find((item) => item.product.id === product.id);
        if (existing) {
          updateQuantity(product.id, existing.quantity + quantity);
        } else {
          addItem(product);
          if (quantity > 1) {
            updateQuantity(product.id, quantity);
          }
        }
        setCommandFeedback(
          `Se agrego ${product.nombre} (${quantity}) al carrito via ${fromVoice ? "voz" : "texto"}.`
        );
        return;
      }

      if (normalized.includes("quitar") || normalized.includes("eliminar")) {
        const productName = normalized
          .replace("quitar", "")
          .replace("eliminar", "")
          .trim();
        if (!productName) {
          setCommandFeedback("Indica el producto que deseas quitar.");
          return;
        }
        const product = findProductByCommand(productName);
        if (!product) {
          setCommandFeedback("No pude encontrar el producto a quitar.");
          return;
        }
        removeItem(product.id);
        setCommandFeedback(`Se elimino ${product.nombre} del carrito.`);
        return;
      }

      if (normalized.includes("vaciar") || normalized.includes("limpiar")) {
        clear();
        setCommandFeedback("Se vacio el carrito.");
        return;
      }

      if (normalized.includes("pagar") || normalized.includes("comprar")) {
        handleCheckout();
        setCommandFeedback("Procesando pago...");
        return;
      }

      setCommandFeedback("No entendi el comando. Intenta con 'agregar', 'quitar', 'pagar' o 'vaciar'.");
    },
    [catalog, findProductByCommand, items, updateQuantity, addItem, removeItem, clear, handleCheckout]
  );

  const { isListening, isSupported, startListening, stopListening } = useSpeechToText({
    onResult: (text) => {
      setCommandInput(text);
      interpretCommand(text, true);
    },
  });

  return (
    <section className="space-y-8 max-w-4xl mx-auto">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Tu carrito</h1>
        <p className="text-gray-500">
          Revisa los productos seleccionados y completa tu compra de forma segura.
        </p>
      </header>

      {checkoutMutation.isError && (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-600 text-sm">
          No pudimos iniciar el pago con Stripe. Intenta nuevamente en unos segundos.
        </div>
      )}

      <section className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-800">Asistente para comandos</p>
            <p className="text-sm text-gray-500">
              Controla el carrito escribiendo o dictando instrucciones. Ejemplo:
              “agregar laptop 2”, “quitar auriculares”, “pagar pedido”.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (isListening ? stopListening() : startListening())}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isListening ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
            }`}
            disabled={!isSupported}
          >
            {isSupported ? (isListening ? "Detener voz" : "Hablar") : "Voz no disponible"}
          </button>
        </div>

        <textarea
          value={commandInput}
          onChange={(event) => setCommandInput(event.target.value)}
          placeholder="Escribe o dicta tu comando..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          rows={3}
        />

        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => interpretCommand(commandInput, false)}
            className="rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            disabled={!commandInput.trim()}
          >
            Ejecutar comando
          </button>
          {commandFeedback && <span className="text-gray-600">{commandFeedback}</span>}
        </div>

        {!isSupported && (
          <p className="text-xs text-yellow-600">
            Tu navegador no soporta reconocimiento de voz. Puedes seguir usando comandos de texto.
          </p>
        )}
      </section>

      {!items.length ? (
        <div className="bg-white shadow rounded p-6 text-center space-y-4">
          <p className="text-gray-500">Tu carrito esta vacio por ahora.</p>
          <Link
            to="/"
            className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-sky-600 transition"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cartSummary.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-lg shadow p-4 flex flex-col gap-4 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <p className="font-semibold text-lg">{item.product.nombre}</p>
                  <p className="text-sm text-gray-500">
                    {item.product.descripcion || "Sin descripcion"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.product.id, Number(event.target.value) || 1)
                    }
                    className="w-20 border rounded px-2 py-1 text-center"
                  />
                  <div className="text-right text-sm text-gray-600">
                    {item.hasDiscount ? (
                      <>
                        <span className="block text-xs text-gray-400 line-through">
                          {priceFormatter.format(item.originalPrice)}
                        </span>
                        <span className="font-semibold text-primary">
                          {priceFormatter.format(item.unitPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-gray-800">
                        {priceFormatter.format(item.unitPrice)}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {priceFormatter.format(item.total)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  className="text-red-500 hover:text-red-600 text-sm font-medium"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between text-lg">
              <span>Total</span>
              <span className="font-semibold text-gray-800">
                {priceFormatter.format(totalAmount)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!items.length || checkoutMutation.isPending}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {checkoutMutation.isPending ? "Redirigiendo a Stripe..." : "Pagar con Stripe"}
            </button>
            <p className="text-xs text-center text-gray-500">
              Stripe te permite pagar en dolares con tarjeta o escaneando el QR de Cash App Pay.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

