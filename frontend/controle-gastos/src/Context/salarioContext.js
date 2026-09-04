import { createContext, useContext } from "react";

/** Contexto e hook separados do provider, exigência do Fast Refresh do Vite. */
export const SalarioContext = createContext(null);

export function useSalario() {
  const contexto = useContext(SalarioContext);

  if (!contexto) {
    throw new Error("useSalario precisa estar dentro de <SalarioProvider>.");
  }

  return contexto;
}
