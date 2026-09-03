/**
 * Tradução de erro de API para linguagem de produto.
 *
 * Regra que vale para todo o app: o usuário nunca vê mensagem técnica. Com
 * APP_DEBUG ligado o Laravel devolve `exception`, `file` e trecho de SQL no
 * corpo do erro — por isso a mensagem do servidor só é aproveitada nos status
 * em que ela é, por contrato, uma mensagem escrita para pessoas (401, 403, 404,
 * 422, 429). Em 5xx e em erro de rede usamos texto nosso.
 */

const GENERICA = "Não foi possível concluir a operação. Tente novamente.";

/**
 * @returns {{ mensagem: string, campos: Record<string, string>, status: number|null, esperar: number|null }}
 */
export function extrairErro(error) {
  const vazio = { campos: {}, status: null, esperar: null };

  if (error?.code === "ERR_CANCELED") {
    return { ...vazio, mensagem: "" };
  }

  // Sem `response` a requisição nem chegou ao servidor.
  if (!error?.response) {
    return {
      ...vazio,
      mensagem: "Não foi possível conectar ao servidor. Verifique sua conexão.",
    };
  }

  const { status, data, headers } = error.response;

  if (status === 422) {
    const campos = {};

    for (const [campo, mensagens] of Object.entries(data?.errors ?? {})) {
      campos[campo] = Array.isArray(mensagens) ? mensagens[0] : String(mensagens);
    }

    return {
      status,
      campos,
      esperar: null,
      mensagem: Object.keys(campos).length
        ? "Revise os campos destacados."
        : textoDoServidor(data) ?? GENERICA,
    };
  }

  if (status === 429) {
    const segundos = Number.parseInt(headers?.["retry-after"], 10);
    const esperar = Number.isFinite(segundos) ? segundos : null;

    return {
      ...vazio,
      status,
      esperar,
      mensagem: esperar
        ? `Muitas tentativas. Aguarde ${esperar} segundo${esperar === 1 ? "" : "s"} e tente de novo.`
        : "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
    };
  }

  if (status === 401 || status === 403) {
    return { ...vazio, status, mensagem: textoDoServidor(data) ?? "Acesso não autorizado." };
  }

  if (status === 404) {
    return { ...vazio, status, mensagem: textoDoServidor(data) ?? "Registro não encontrado." };
  }

  return { ...vazio, status, mensagem: GENERICA };
}

/**
 * Aceita a mensagem do servidor apenas se ela parecer texto para humanos.
 * Qualquer sinal de vazamento técnico é descartado.
 */
function textoDoServidor(data) {
  const mensagem = data?.message;

  if (typeof mensagem !== "string" || mensagem.trim() === "") return null;

  const tecnico = /SQLSTATE|exception|vendor[\\/]|Stack trace|::class|\.php|SELECT |INSERT |UPDATE /i;
  if (tecnico.test(mensagem) || mensagem.length > 160) return null;

  return mensagem;
}
