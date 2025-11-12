import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
  type CategoryPayload,
} from "../../api";
import { invalidateCacheKeys } from "../../core/offlineCache";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

type FormState = {
  nombre: string;
  descripcion: string;
};

const emptyForm: FormState = {
  nombre: "",
  descripcion: "",
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

const inputClass =
  "w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function AdminCategories() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categorias-admin"],
    queryFn: fetchCategories,
  });

  const sortedCategories = useMemo(() => {
    const data = categoriesQuery.data ?? [];
    return [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [categoriesQuery.data]);

  const refreshCategoryCaches = () => {
    invalidateCacheKeys("categorias");
    queryClient.invalidateQueries({ queryKey: ["categorias-admin"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: CategoryPayload }) =>
      id ? updateCategory(id, payload) : createCategory(payload),
    onMutate: () => setFeedback(null),
    onSuccess: (_data, variables) => {
      refreshCategoryCaches();
      setFeedback({
        type: "success",
        message: variables.id ? "Categoría actualizada correctamente." : "Categoría creada correctamente.",
      });
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () =>
      setFeedback({
        type: "error",
        message: "No pudimos guardar la categoría. Inténtalo nuevamente.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      refreshCategoryCaches();
      setFeedback({ type: "success", message: "Categoría eliminada correctamente." });
      setConfirmDelete(null);
    },
    onError: () =>
      setFeedback({
        type: "error",
        message: "No pudimos eliminar la categoría.",
      }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = form.nombre.trim();
    if (!trimmedName) {
      setFeedback({ type: "error", message: "El nombre de la categoría es obligatorio." });
      return;
    }

    const payload: CategoryPayload = {
      nombre: trimmedName,
      descripcion: form.descripcion.trim() || undefined,
    };

    saveMutation.mutate({ id: editingId, payload });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      nombre: category.nombre,
      descripcion: category.descripcion ?? "",
    });
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const isBusy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Catálogo</p>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500">
            Crea, edita y organiza las categorías que agrupan tus productos. Los cambios son visibles en toda
            la plataforma.
          </p>
        </div>
      </header>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar categoría" : "Nueva categoría"}
              </h2>
              <p className="text-sm text-gray-500">
                Completa los campos y guarda para mantener actualizado tu catálogo.
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                disabled={isBusy}
              >
                <X size={14} />
                Cancelar
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="category-name" className="text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                id="category-name"
                name="nombre"
                autoComplete="off"
                className={inputClass}
                placeholder="Ej. Refrigeradores"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category-description" className="text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="category-description"
                name="descripcion"
                className={`${inputClass} min-h-[120px] resize-none`}
                placeholder="Describe qué productos agrupa esta categoría"
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                disabled={isBusy}
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isBusy}
          >
            {saveMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {editingId ? "Actualizar categoría" : "Guardar categoría"}
          </button>
        </form>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Listado</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {sortedCategories.length} categorías
            </span>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : categoriesQuery.isError ? (
            <p className="mt-6 text-sm text-red-600">
              No pudimos cargar las categorías. Intenta actualizar la página.
            </p>
          ) : !sortedCategories.length ? (
            <p className="mt-6 text-sm text-gray-500">Aún no hay categorías registradas.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {sortedCategories.map((category) => {
                const isConfirming = confirmDelete === category.id;
                return (
                  <li key={category.id} className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{category.nombre}</p>
                      {category.descripcion ? (
                        <p className="text-xs text-gray-500 line-clamp-2">{category.descripcion}</p>
                      ) : (
                        <p className="text-xs text-gray-400">Sin descripción</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        onClick={() => startEdit(category)}
                        disabled={isBusy}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(category.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirmar"}
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleteMutation.isPending}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                          onClick={() => setConfirmDelete(category.id)}
                          disabled={isBusy}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
