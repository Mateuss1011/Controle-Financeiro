import { createContext, useContext } from "react";

/**
 * Contexto e hook ficam separados do provider: o Fast Refresh do Vite só
 * preserva estado em arquivos que exportam exclusivamente componentes.
 */
export const ToastContext = createContext(null);

export function useToast() {
  const contexto = useContext(ToastContext);

  if (!contexto) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  }

  return contexto;
}
