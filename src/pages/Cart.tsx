import { useCallback, useMemo, useState, type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createCheckoutSession,
  fetchProducts,
  getProductEffectivePrice,
  type Product,
} from "../api";
import { useCartStore } from "../core/cartStore";
import { useUserStore } from "../core/store";
import { useSpeechToText } from "../hooks/useSpeechToText";

/* ===================== Utils ===================== */
const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FREE_SHIPPING_THRESHOLD = 100; // solo UI

function classNames(...cx: Array<string | false | null | undefined>) {
  return cx.filter(Boolean).join(" ");
}

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* ===================== UI Primitives ===================== */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={classNames("rounded-3xl border border-gray-100 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

function Button(
  {
    children,
    variant = "solid",
    className = "",
    ...rest
  }: JSX.IntrinsicElements["button"] & { variant?: "solid" | "soft" | "ghost" | "danger" }
) {
  const variants = {
    solid: "bg-primary text-white hover:bg-primary/90",
    soft: "bg-primary/10 text-primary hover:bg-primary/20",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  } as const;
  return (
    <button
      {...rest}
      className={classNames(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-gray-200">
      <button
        type="button"
        aria-label="Disminuir"
        className="px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-14 border-x border-gray-200 text-center text-sm outline-none"
      />
      <button
        type="button"
        aria-label="Aumentar"
        className="px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function LineItemPrice({ unit, original, hasDiscount }: { unit: number; original: number; hasDiscount: boolean }) {
  return (
    <div className="text-right text-sm">
      {hasDiscount ? (
        <>
          <span className="block text-xs text-gray-400 line-through">{priceFormatter.format(original)}</span>
          <span className="font-semibold text-primary">{priceFormatter.format(unit)}</span>
        </>
      ) : (
        <span className="font-semibold text-gray-800">{priceFormatter.format(unit)}</span>
      )}
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 text-center">
      <div className="text-4xl">🛒</div>
      <h3 className="mt-2 text-lg font-semibold text-gray-900">Tu carrito está vacío</h3>
      <p className="mt-1 text-sm text-gray-500">Explora el catálogo y agrega tus productos favoritos.</p>
      <Link to="/" className="mt-5 inline-block rounded-2xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">
        Ver productos
      </Link>
    </Card>
  );
}

/* ===================== Componente principal ===================== */
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
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [commandSuggestions, setCommandSuggestions] = useState<Product[]>([]);
  const [suggestionMode, setSuggestionMode] = useState<"add" | "remove" | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);

  const { data: catalog } = useQuery({ queryKey: ["productos-cart"], queryFn: fetchProducts });

  const searchIndex = useMemo(
    () =>
      (catalog ?? []).map((product) => ({
        product,
        normalized: normalizeText(product.nombre),
      })),
    [catalog],
  );

  const findProducts = useCallback(
    (query: string) => {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) {
        return { exact: null as Product | null, matches: [] as Product[] };
      }

      const words = normalizedQuery.split(" ").filter(Boolean);
      let exact: Product | null = null;
      const matches: Product[] = [];

      for (const { product, normalized } of searchIndex) {
        if (normalized === normalizedQuery) {
          exact = product;
        }
        if (words.every((word) => normalized.includes(word))) {
          if (!matches.includes(product)) {
            matches.push(product);
          }
        }
      }

      return { exact, matches };
    },
    [searchIndex],
  );

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
        const originalPrice = Number(item.product.active_discount?.precio_original ?? item.product.precio);
        const hasDiscount = Boolean(item.product.active_discount?.esta_activo);
        return { ...item, unitPrice, originalPrice, hasDiscount, total: unitPrice * item.quantity };
      }),
    [items]
  );

  const savings = useMemo(() => {
    return cartSummary.reduce((acc, it) => acc + Math.max(0, it.originalPrice - it.unitPrice) * it.quantity, 0);
  }, [cartSummary]);

  const handleCheckout = () => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (!items.length || checkoutMutation.isPending) return;
    checkoutMutation.mutate({
      usuarioId: user.id,
      items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      successUrl: `${window.location.origin}/?payment=success`,
      cancelUrl: `${window.location.origin}/?payment=cancel`,
    });
  };

  const applyAddToCart = useCallback(
    (product: Product, quantity: number, fromVoice: boolean) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        updateQuantity(product.id, existing.quantity + quantity);
      } else {
        addItem(product);
        if (quantity > 1) {
          updateQuantity(product.id, quantity);
        }
      }
      setCommandFeedback(
        `Se agregó ${product.nombre} (${quantity}) al carrito vía ${fromVoice ? "voz" : "texto"}.`
      );
      setCommandSuggestions([]);
      setSuggestionMode(null);
      setPendingQuantity(1);
    },
    [addItem, items, updateQuantity]
  );

  const handleSuggestionSelection = useCallback(
    (product: Product) => {
      if (suggestionMode === "add") {
        applyAddToCart(product, pendingQuantity, false);
        return;
      }
      if (suggestionMode === "remove") {
        removeItem(product.id);
        setCommandFeedback(`Se eliminó ${product.nombre} del carrito.`);
        setCommandSuggestions([]);
        setSuggestionMode(null);
        setPendingQuantity(1);
      }
    },
    [applyAddToCart, pendingQuantity, removeItem, suggestionMode]
  );

  const interpretCommand = useCallback(
    (instruction: string, fromVoice = false) => {
      if (!instruction.trim()) return;
      if (!catalog?.length) {
        setCommandFeedback("Aún estamos cargando el catálogo. Intenta en unos segundos.");
        return;
      }

      setCommandSuggestions([]);
      setSuggestionMode(null);

      const lower = instruction.toLowerCase();

      const stripAction = (value: string) =>
        value.replace(/agregar/gi, "").replace(/añadir/gi, "").replace(/anadir/gi, "").trim();

      if (lower.includes("agregar") || lower.includes("añadir") || lower.includes("anadir")) {
        const baseText = stripAction(instruction);
        if (!baseText) {
          setCommandFeedback("Necesito el nombre del producto que deseas agregar.");
          return;
        }

        const attempts: Array<{ text: string; quantity: number }> = [];
        const trailingNumberMatch = baseText.match(/(\d+)\s*$/);
        if (trailingNumberMatch) {
          const quantityValue = Math.max(1, Number(trailingNumberMatch[1]));
          const withoutNumber = baseText.slice(0, trailingNumberMatch.index).trim();
          if (withoutNumber) {
            attempts.push({ text: withoutNumber, quantity: quantityValue });
          }
          if (!withoutNumber) {
            attempts.push({ text: baseText, quantity: quantityValue });
          } else {
            attempts.push({ text: baseText, quantity: 1 });
          }
        } else {
          attempts.push({ text: baseText, quantity: 1 });
        }

        let candidates: Product[] = [];
        let exact: Product | null = null;
        let usedQuantity = 1;
        let searchLabel = baseText;

        for (const attempt of attempts) {
          const result = findProducts(attempt.text);
          if (result.matches.length) {
            candidates = result.matches;
            exact = result.exact;
            usedQuantity = attempt.quantity;
            searchLabel = attempt.text;
            break;
          }
        }

        if (!candidates.length) {
          setCommandFeedback("No pude encontrar ese producto.");
          return;
        }

        const selectedProduct = exact ?? (candidates.length === 1 ? candidates[0] : null);
        if (!selectedProduct) {
          setPendingQuantity(usedQuantity);
          setSuggestionMode("add");
          setCommandSuggestions(candidates);
          const preview = candidates
            .slice(0, 5)
            .map((p) => p.nombre)
            .join(" - ");
          setCommandFeedback(
            `Encontré ${candidates.length} productos para "${searchLabel}". Elige uno de la lista: ${preview}${
              candidates.length > 5 ? "..." : ""
            }`
          );
          return;
        }

        applyAddToCart(selectedProduct, usedQuantity, fromVoice);
        return;
      }

      if (lower.includes("quitar") || lower.includes("eliminar")) {
        const productNameRaw = instruction.replace(/quitar/gi, "").replace(/eliminar/gi, "").trim();
        if (!productNameRaw) {
          setCommandFeedback("Indica el producto que deseas quitar.");
          return;
        }

        const { exact, matches } = findProducts(productNameRaw);
        if (!matches.length) {
          setCommandFeedback("No pude encontrar el producto a quitar.");
          return;
        }

        const product = exact ?? (matches.length === 1 ? matches[0] : null);
        if (!product) {
          setSuggestionMode("remove");
          setCommandSuggestions(matches);
          const preview = matches
            .slice(0, 5)
            .map((p) => p.nombre)
            .join(" - ");
          setCommandFeedback(
            `Encontré ${matches.length} productos que coinciden con "${productNameRaw}". Selecciona uno de la lista: ${preview}${
              matches.length > 5 ? "..." : ""
            }`
          );
          return;
        }

        removeItem(product.id);
        setCommandFeedback(`Se eliminó ${product.nombre} del carrito.`);
        setPendingQuantity(1);
        return;
      }

      if (lower.includes("vaciar") || lower.includes("limpiar")) {
        clear();
        setCommandFeedback("Se vació el carrito.");
        setPendingQuantity(1);
        return;
      }

      if (lower.includes("pagar") || lower.includes("comprar")) {
        handleCheckout();
        setCommandFeedback("Procesando pago...");
        setPendingQuantity(1);
        return;
      }

      setCommandFeedback("No entendí el comando. Intenta con 'agregar', 'quitar', 'pagar' o 'vaciar'.");
    },
    [catalog, findProducts, applyAddToCart, removeItem, clear, handleCheckout]
  );

  const { isListening, isSupported, startListening, stopListening } = useSpeechToText({
    onResult: (text) => {
      setCommandInput(text);
      interpretCommand(text, true);
    },
  });

  /* ===================== Render ===================== */
  const progressLeft = Math.max(0, FREE_SHIPPING_THRESHOLD - totalAmount);

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Tu carrito</h1>
        <p className="text-gray-500">Revisa los productos y completa tu compra de forma segura.</p>
      </header>

      {/* Voz + comandos */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-800">Asistente de comandos</p>
            <p className="text-sm text-gray-500">Ejemplos: “agregar laptop 2”, “quitar auriculares”, “pagar”.</p>
          </div>
          <Button
            type="button"
            onClick={() => (isListening ? stopListening() : startListening())}
            className="rounded-full"
            variant={isListening ? "danger" : "soft"}
            disabled={!isSupported}
          >
            {isSupported ? (isListening ? "Detener voz" : "Hablar") : "Voz no disponible"}
          </Button>
        </div>
        <textarea
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Escribe o dicta tu comando..."
          className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          rows={3}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Button type="button" onClick={() => interpretCommand(commandInput)} disabled={!commandInput.trim()}>
            Ejecutar comando
          </Button>
          {commandFeedback && <span className="text-gray-600">{commandFeedback}</span>}
        </div>
        {commandSuggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span className="font-medium text-gray-500">Coincidencias:</span>
            {commandSuggestions.slice(0, 6).map((product) => (
              <Button
                key={product.id}
                variant="ghost"
                className="border border-gray-200 px-3 py-1 text-xs font-semibold text-primary hover:border-primary"
                onClick={() => handleSuggestionSelection(product)}
              >
                {product.nombre}
              </Button>
            ))}
            {commandSuggestions.length > 6 && <span className="text-xs text-gray-400">Y más...</span>}
          </div>
        )}
        {!isSupported && (
          <p className="mt-2 text-xs text-yellow-600">Tu navegador no soporta reconocimiento de voz. Usa comandos de texto.</p>
        )}
      </Card>

      {checkoutMutation.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No pudimos iniciar el pago con Stripe. Intenta nuevamente en unos segundos.
        </div>
      )}

      {/* Contenido principal */}
      {!items.length ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Lista de items */}
          <div className="space-y-4">
            {cartSummary.map((item) => (
              <Card key={item.product.id} className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  {/* Imagen */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                    {/* placeholder simple; si tienes imageUrl => usa <img src={...} /> */}
                    <div className="flex h-full w-full items-center justify-center text-gray-300">IMG</div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-gray-900">{item.product.nombre}</p>
                    <p className="truncate text-sm text-gray-500">{item.product.descripcion || "Sin descripción"}</p>
                    {item.hasDiscount && (
                      <span className="mt-2 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Oferta activa
                      </span>
                    )}
                  </div>

                  {/* Controles */}
                  <div className="flex flex-1 items-center justify-between gap-4 md:justify-end">
                    <QtyStepper value={item.quantity} onChange={(n) => updateQuantity(item.product.id, n)} />
                    <LineItemPrice unit={item.unitPrice} original={item.originalPrice} hasDiscount={item.hasDiscount} />
                    <div className="text-right text-sm font-semibold text-gray-900 min-w-[90px]">
                      {priceFormatter.format(item.total)}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    className="self-start md:self-auto"
                    onClick={() => setConfirmRemoveId(item.product.id)}
                  >
                    Quitar
                  </Button>
                </div>

                {/* Confirm remove */}
                {confirmRemoveId === item.product.id && (
                  <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                    <span className="text-gray-500">¿Eliminar este producto?</span>
                    <Button variant="ghost" onClick={() => setConfirmRemoveId(null)}>Cancelar</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        removeItem(item.product.id);
                        setConfirmRemoveId(null);
                      }}
                    >
                      Confirmar
                    </Button>
                  </div>
                )}
              </Card>
            ))}

            {/* Acciones lista */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to="/" className="text-sm font-semibold text-primary hover:underline">Seguir comprando</Link>
              <Button variant="ghost" onClick={clear}>Vaciar carrito</Button>
            </div>
          </div>

          {/* Resumen */}
          <div className="lg:sticky lg:top-6">
            <Card className="p-6">
              {/* Envío gratis */}
              {totalAmount < FREE_SHIPPING_THRESHOLD ? (
                <div className="mb-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-800">
                  Te faltan <strong>{priceFormatter.format(progressLeft)}</strong> para envío gratis.
                  <div className="mt-2"><Progress value={totalAmount} max={FREE_SHIPPING_THRESHOLD} /></div>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">¡Tienes envío gratis!</div>
              )}

              <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{priceFormatter.format(totalAmount)}</span></div>
                {savings > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Ahorros por descuentos</span><span>-{priceFormatter.format(savings)}</span></div>
                )}
                <div className="flex justify-between text-gray-600"><span>Envío</span><span>{totalAmount >= FREE_SHIPPING_THRESHOLD ? "Gratis" : "Se calcula al pagar"}</span></div>
              </div>

              <div className="my-4 h-px bg-gray-100" />

              <div className="flex items-center justify-between text-lg">
                <span>Total</span>
                <span className="font-semibold text-gray-900">{priceFormatter.format(totalAmount)}</span>
              </div>

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={!items.length || checkoutMutation.isPending}
                className="mt-4 w-full"
              >
                {checkoutMutation.isPending ? "Redirigiendo a Stripe..." : "Pagar con Stripe"}
              </Button>
              <p className="mt-2 text-center text-xs text-gray-500">Stripe permite pagar en dólares con tarjeta o QR de Cash App Pay.</p>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
