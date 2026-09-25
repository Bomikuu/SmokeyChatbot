import { apiRequest } from "@/api/client";

export interface Owner {
  email: string;
}

export const getCurrentOwner = () => apiRequest<Owner>("/auth/me");

export const signUp = (email: string, password: string) =>
  apiRequest<{ message: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signIn = (email: string, password: string) =>
  apiRequest<Owner>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signOut = () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
