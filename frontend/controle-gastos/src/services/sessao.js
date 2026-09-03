/**
 * Guarda do token de acesso.
 *
 * Único lugar do app que toca no armazenamento da sessão. Antes o
 * `localStorage.getItem("token")` estava espalhado por cinco arquivos, o que
 * tornava impossível trocar a estratégia de armazenamento depois.
 */

const CHAVE = "cf.token";
const CHAVE_ANTIGA = "token";

/** Evento emitido quando a API responde 401 e a sessão precisa cair. */
export const EVENTO_SESSAO_EXPIRADA = "cf:sessao-expirada";

export function lerToken() {
  try {
    // Migração silenciosa de quem já estava logado com a chave antiga.
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      localStorage.setItem(CHAVE, antigo);
      localStorage.removeItem(CHAVE_ANTIGA);
      return antigo;
    }

    return localStorage.getItem(CHAVE);
  } catch {
    // Navegador com armazenamento bloqueado: a sessão simplesmente não persiste.
    return null;
  }
}

export function gravarToken(token) {
  try {
    localStorage.setItem(CHAVE, token);
  } catch {
    // Sem persistência, a sessão vale só para esta aba.
  }
}

export function limparToken() {
  try {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    // Nada a fazer.
  }
}

export function avisarSessaoExpirada() {
  window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
}
