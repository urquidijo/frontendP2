import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
  fetchRoles,
  fetchUsers,
  type AdminUserPayload,
} from "../../api";

const blankUserForm = {
  username: "",
  email: "",
  password: "",
  rol: "",
};

export default function AdminUsers() {
  const [userForm, setUserForm] = useState(blankUserForm);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<number, string>>({});

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsers,
  });

  const rolesQuery = useQuery({
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
    mutationFn: ({ id, payload }: { id: number; payload: AdminUserPayload }) =>
      adminUpdateUser(id, payload),
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
      setUserFeedback("Completa usuario, correo y contrasena.");
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
    updateUserMutation.mutate({
      id: userId,
      payload: { rol: draftValue ? Number(draftValue) : null },
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Gestion de usuarios</p>
          <h2 className="text-3xl font-semibold text-gray-900">Asigna roles y permisos</h2>
          <p className="text-sm text-gray-500">
            Crea cuentas nuevas y controla el rol asignado a cada colaborador.
          </p>
        </div>
        <span className="text-sm text-gray-500 lg:text-right">
          La lista se actualiza automaticamente al gestionar usuarios.
        </span>
      </header>

      {usersLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-3xl border border-gray-100 bg-gray-50 animate-pulse" />
          <div className="h-80 rounded-3xl border border-gray-100 bg-gray-50 animate-pulse" />
        </div>
      ) : usersError ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          No pudimos obtener los usuarios. Intenta nuevamente.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleUserSubmit}
            className="space-y-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="user-name">
                Usuario
              </label>
              <input
                id="user-name"
                value={userForm.username}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, username: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Nombre de usuario"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="user-email">
                Correo
              </label>
              <input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="correo@empresa.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="user-pass">
                Contrasena
              </label>
              <input
                id="user-pass"
                type="password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="user-role">
                Rol asignado
              </label>
              <select
                id="user-role"
                value={userForm.rol}
                disabled={rolesQuery.isLoading}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, rol: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Cliente (predeterminado)</option>
                {rolesQuery.data?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {createUserMutation.isPending ? "Creando..." : "Crear usuario"}
            </button>
            {userFeedback && <p className="text-xs text-gray-500">{userFeedback}</p>}
          </form>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Usuarios creados</h3>
            <p className="text-sm text-gray-500">
              Usa los selectores para cambiar el rol y asigna permisos especificos.
            </p>
            <div className="mt-4 space-y-3 max-h-[460px] overflow-auto pr-2">
              {!users?.length ? (
                <p className="text-sm text-gray-500">Aun no hay usuarios registrados.</p>
              ) : (
                users.map((user) => {
                  const draftValue =
                    userRoleDrafts[user.id] ?? (user.rol ? String(user.rol) : "");
                  return (
                    <article
                      key={user.id}
                      className="rounded-2xl border border-gray-100 p-4 text-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{user.username}</p>
                          <p className="text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">
                            Rol actual:{" "}
                            <span className="font-medium text-gray-700">
                              {user.rol_nombre ?? "Sin rol"}
                            </span>
                          </p>
                          {user.permisos.length > 0 && (
                            <p className="text-xs text-gray-400">
                              Permisos:{" "}
                              <span className="font-medium text-gray-700">
                                {user.permisos.join(", ")}
                              </span>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">#{user.id}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <select
                          value={draftValue}
                          onChange={(event) => handleUserRoleChange(user.id, event.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="">Sin rol</option>
                          {rolesQuery.data?.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.nombre}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUserRoleSave(user.id)}
                            disabled={updateUserMutation.isPending}
                            className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                          >
                            Guardar rol
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="flex-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
