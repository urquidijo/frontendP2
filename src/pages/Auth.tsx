import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

import { loginUser, registerUser } from "../api";
import { useLoginForm, useRegisterForm } from "../core/form";
import { useUserStore } from "../core/store";

type MessageState = { type: "success" | "error"; text: string } | null;

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string })?.detail;
    if (detail) return detail;
  }
  return "Ocurrio un error. Intenta de nuevo.";
};

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname.includes("login");

  const [message, setMessage] = useState<MessageState>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const setSession = useUserStore((state) => state.setSession);

  const registerForm = useRegisterForm();
  const loginForm = useLoginForm();
  const registerErrors = registerForm.formState.errors;
  const loginErrors = loginForm.formState.errors;
  const activeErrors = isLogin ? loginErrors : registerErrors;
  const usernameRegister = isLogin
    ? loginForm.register("username")
    : registerForm.register("username");
  const passwordRegister = isLogin
    ? loginForm.register("password")
    : registerForm.register("password");

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onMutate: () => setMessage(null),
    onSuccess: ({ user, token }) => {
      setSession(user, token);
      setMessage({ type: "success", text: `Bienvenido ${user.username}` });
      loginForm.reset();
      navigate("/");
    },
    onError: (error) => {
      setMessage({ type: "error", text: getErrorMessage(error) });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onMutate: () => setMessage(null),
    onSuccess: (_, variables) => {
      setMessage({ type: "success", text: "Registro completado. Iniciando sesion..." });
      registerForm.reset();
      loginMutation.mutate({ username: variables.username, password: variables.password });
    },
    onError: (error) => {
      setMessage({ type: "error", text: getErrorMessage(error) });
    },
  });

  const onSubmit = isLogin
    ? loginForm.handleSubmit((formData) => loginMutation.mutate(formData))
    : registerForm.handleSubmit((formData) => registerMutation.mutate(formData));

  const activeMutation = isLogin ? loginMutation : registerMutation;
  const isPasswordVisible = isLogin ? showLoginPassword : showRegisterPassword;
  const togglePasswordVisibility = () => {
    if (isLogin) {
      setShowLoginPassword((prev) => !prev);
    } else {
      setShowRegisterPassword((prev) => !prev);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-center mb-2">
          {isLogin ? "Iniciar sesion" : "Crear cuenta"}
        </h2>
        <p className="text-center text-gray-500 text-sm">
          {isLogin
            ? "Ingresa con tu usuario para ver tus pedidos."
            : "Completa los datos para crear una cuenta y empezar a comprar."}
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <input
            {...usernameRegister}
            placeholder="Usuario"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {activeErrors.username && (
            <p className="text-red-500 text-sm mt-1">{activeErrors.username.message}</p>
          )}
        </div>

        {!isLogin && (
          <div>
            <input
              {...registerForm.register("email")}
              placeholder="Correo electronico"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {registerErrors.email && (
              <p className="text-red-500 text-sm mt-1">{registerErrors.email.message}</p>
            )}
          </div>
        )}

        <div>
          <div className="relative">
            <input
              {...passwordRegister}
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Contrasena"
              className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-primary"
              aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {activeErrors.password && (
            <p className="text-red-500 text-sm mt-1">{activeErrors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={activeMutation.isPending}
          className="w-full bg-primary text-white py-2 rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {activeMutation.isPending
            ? "Procesando..."
            : isLogin
            ? "Iniciar sesion"
            : "Registrarme"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        {isLogin ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
        <Link to={isLogin ? "/register" : "/login"} className="text-primary font-medium">
          {isLogin ? "Crear una ahora" : "Ingresa aqui"}
        </Link>
      </p>
    </div>
  );
}
