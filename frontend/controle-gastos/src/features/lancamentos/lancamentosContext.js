import { createContext, useContext } from "react";

export const LancamentosContext = createContext(null);

/**
 * Acesso ao formulário global de lançamento e ao sinal de mudança.
 *
 * `versao` incrementa a cada criação, edição ou exclusão. Quem lista gastos
 * observa esse número e recarrega — é como o Dashboard fica em dia quando o
 * usuário adiciona um lançamento pelo botão da casca, sem que uma tela precise
 * conhecer a outra.
 */
export function useLancamentosGlobais() {
  const contexto = useContext(LancamentosContext);

  if (!contexto) {
    throw new Error("useLancamentosGlobais precisa estar dentro de <LancamentosProvider>.");
  }

  return contexto;
}
