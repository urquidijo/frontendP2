import { useState } from "react";
import type { FormEvent, JSX } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
  fetchRoles,
  fetchUsers,
  type AdminUserPayload,
} from "../../api";

/* ===================== Tipos ===================== */
export type RoleOption = { id: number; nombre: string };
export type UserItem = {
  id: number;
  username: string;
  email: string;
  rol: number | null;
  rol_nombre?: string | null;
  permisos: string[];
};

/* ===================== Estado base ===================== */
const blankUserForm = {
  username: "",
  email: "",
  password: "",
  rol: "",
};

/* ===================== UI helpers (sin libs) ===================== */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function Input(props: JSX.IntrinsicElements["input"]) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition ${props.className ?? ""}`}
    />
  );
}

function Select(props: JSX.IntrinsicElements["select"]) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition ${props.className ?? ""}`}
    />
  );
}

function Button(
  { children, variant = "solid", className = "", ...rest }:
  JSX.IntrinsicElements["button"] & { variant?: "solid" | "soft" | "danger" | "ghost" }
) {
  const variants = {
    solid: "bg-primary text-white hover:bg-primary/90",
    soft: "bg-primary/10 text-primary hover:bg-primary/20",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-50",
  } as const;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Skeleton({ className = "h-8" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function Alert({ type = "info", message }: { type?: "info" | "error" | "success"; message: string }) {
  const styles = {
    info: "border-blue-100 bg-blue-50 text-blue-700",
    error: "border-red-100 bg-red-50 text-red-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  } as const;
  return <div className={`rounded-2xl border p-3 text-sm ${styles[type]}`}>{message}</div>;
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
      {initials || "?"}
    </div>
  );
}

/* Chips de permisos con colapso para evitar overflow */
function PermissionChips({ permisos }: { permisos: string[] }) {
  const [open, setOpen] = useState(false);
  const MAX = 6;
  const visible = open ? permisos : permisos.slice(0, MAX);
  const extra = permisos.length - visible.length;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
      {visible.map((perm) => (
        <span
          key={perm}
          title={perm}
          className="max-w-[220px] truncate rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700"
        >
          {perm}
        </span>
      ))}
      {extra > 0 && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
        >
          +{extra} más
        </button>
      ) : null}
      {open && permisos.length > MAX ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full bg-gray-50 px-2 py-0.5 font-semibold text-gray-600 hover:bg-gray-100"
        >
          ver menos
        </button>
      ) : null}
    </div>
  );
}

/* ===================== Componente ===================== */
export default function AdminUsers() {
  const [userForm, setUserForm] = useState(blankUserForm);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<number, string>>({});

  const { data: users, isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useQuery<UserItem[]>({
    queryKey: ["usuarios"],
    queryFn: fetchUsers,
  });

  const rolesQuery = useQuery<RoleOption[]>({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const createUserMutation = useMutation({
    mutationFn: adminCreateUser,
    onMutate: () => setUserFeedback(null),
    onSuccess: () => {
      setUserForm(blankUserForm);
      setUserFeedback("Usuario creado correctamente.");
      refetchUsers();
    },
    onError: () => setUserFeedback("No pudimos crear el usuario."),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminUserPayload }) => adminUpdateUser(id, payload),
    onMutate: () => setUserFeedback(null),
    onSuccess: () => {
      setUserFeedback("Datos del usuario actualizados.");
      refetchUsers();
    },
    onError: () => setUserFeedback("No pudimos actualizar el usuario."),
  });

  const deleteUserMutation = useMutation({
    mutationFn: adminDeleteUser,
    onMutate: () => setUserFeedback(null),
    onSuccess: () => {
      setUserFeedback("Usuario eliminado.");
      refetchUsers();
    },
    onError: () => setUserFeedback("No pudimos eliminar el usuario."),
  });

  const handleUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      setUserFeedback("Completa usuario, correo y contraseña.");
      return;
    }

    const payload = {
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      ...(userForm.rol ? { rol: Number(userForm.rol) } : {}),
    };
    createUserMutation.mutate(payload);
  };

  const handleUserRoleChange = (userId: number, value: string) => {
    setUserRoleDrafts((prev) => ({ ...prev, [userId]: value }));
  };

  const handleUserRoleSave = (userId: number) => {
    const draftValue = userRoleDrafts[userId];
    updateUserMutation.mutate({ id: userId, payload: { rol: draftValue ? Number(draftValue) : null } });
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-r from-white via-white to-primary/5 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Gestión de usuarios</p>
            <h2 className="text-3xl font-semibold text-gray-900">Asigna roles y permisos</h2>
            <p className="text-sm text-gray-500">Crea cuentas nuevas y controla el rol asignado a cada colaborador.</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="hidden sm:block">La lista se actualiza automáticamente al gestionar usuarios.</span>
            {users ? (
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">{users.length} usuarios</span>
            ) : null}
          </div>
        </div>
      </header>

      {userFeedback ? (
        <Alert type={userFeedback.includes("No pudimos") ? "error" : "success"} message={userFeedback} />
      ) : null}

      {/* Content */}
      {usersLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-1/4" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </Card>
        </div>
      ) : usersError ? (
        <Alert type="error" message="No pudimos obtener los usuarios. Intenta nuevamente." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulario */}
          <Card className="p-6">
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Usuario" htmlFor="user-name">
                  <Input
                    id="user-name"
                    value={userForm.username}
                    placeholder="Nombre de usuario"
                    autoComplete="username"
                    onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </Field>
                <Field label="Correo" htmlFor="user-email">
                  <Input
                    id="user-email"
                    type="email"
                    value={userForm.email}
                    placeholder="correo@empresa.com"
                    autoComplete="email"
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </Field>
                <Field label="Contraseña" htmlFor="user-pass" hint="Mínimo 8 caracteres">
                  <Input
                    id="user-pass"
                    type="password"
                    value={userForm.password}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </Field>
                <Field label="Rol asignado" htmlFor="user-role" hint="Si no eliges, se asigna Cliente">
                  <Select
                    id="user-role"
                    value={userForm.rol}
                    disabled={rolesQuery.isLoading}
                    onChange={(e) => setUserForm((p) => ({ ...p, rol: e.target.value }))}
                  >
                    <option value="">Cliente (predeterminado)</option>
                    {rolesQuery.data?.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button type="reset" variant="ghost" onClick={() => setUserForm(blankUserForm)}>
                  Limpiar
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creando…" : "Crear usuario"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Listado */}
          <Card className="p-0">
            <div className="sticky top-0 z-10 rounded-t-3xl border-b border-gray-100 bg-white/90 p-6 backdrop-blur">
              <h3 className="text-base font-semibold text-gray-900">Usuarios creados</h3>
              <p className="text-sm text-gray-500">Usa los selectores para cambiar el rol.</p>
            </div>

            <div className="max-h-[560px] overflow-auto p-4 sm:p-6">
              {!users?.length ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                  <div className="text-3xl">👥</div>
                  <p className="text-sm font-medium text-gray-900">Aún no hay usuarios registrados</p>
                  <p className="text-xs text-gray-500">Crea el primer usuario con el formulario.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {users.map((user) => {
                    const draftValue = userRoleDrafts[user.id] ?? (user.rol ? String(user.rol) : "");
                    return (
                      <li key={user.id} className="rounded-2xl border border-gray-100 p-4 text-sm transition hover:shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <Avatar name={user.username || user.email} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{user.username}</p>
                              <p className="truncate text-gray-500">{user.email}</p>
                              <div className="mt-1 text-xs text-gray-500">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">Rol: {user.rol_nombre ?? "Sin rol"}</span>
                                {user.permisos?.length ? (
                                  <PermissionChips permisos={user.permisos} />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">ID #{user.id}</span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Select value={draftValue} onChange={(e) => handleUserRoleChange(user.id, e.target.value)}>
                            <option value="">Sin rol</option>
                            {rolesQuery.data?.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.nombre}
                              </option>
                            ))}
                          </Select>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="soft"
                              disabled={!!updateUserMutation.isPending}
                              onClick={() => handleUserRoleSave(user.id)}
                            >
                              Guardar rol
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              disabled={!!deleteUserMutation.isPending}
                              onClick={() => deleteUserMutation.mutate(user.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
