import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const usernameMessage = "El usuario es obligatorio";
const passwordMessage = "Minimo 6 caracteres";

export const registerSchema = z.object({
  username: z.string().min(3, usernameMessage),
  email: z.string().email("Correo invalido"),
  password: z.string().min(6, passwordMessage),
});

export const loginSchema = z.object({
  username: z.string().min(3, usernameMessage),
  password: z.string().min(6, passwordMessage),
});

export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;

export const useRegisterForm = () =>
  useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

export const useLoginForm = () =>
  useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
