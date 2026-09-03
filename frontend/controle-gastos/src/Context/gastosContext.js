import { createContext, useContext } from "react";

/** Contexto e hook separados do provider, exigência do Fast Refresh do Vite. */
export const GastosContext = createContext(null);

export function useGastos() {
  return useContext(GastosContext);
}
