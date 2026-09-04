import { createContext, useContext } from "react";

/** Contexto e hook separados do provider, exigência do Fast Refresh do Vite. */
export const GastosContext = createContext(null);

export function useGastos() {
  const contexto = useContext(GastosContext);

  // Sem esta checagem, usar o hook fora do provider quebra numa
  // desestruturação de null, com uma mensagem que não diz o que houve.
  if (!contexto) {
    throw new Error("useGastos precisa estar dentro de <GastosProvider>.");
  }

  return contexto;
}
