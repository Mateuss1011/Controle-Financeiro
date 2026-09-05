import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Orçamentos vigentes numa competência, já confrontados com o gasto real.
 *
 * Limite e gasto vêm juntos do backend porque um sem o outro não diz nada: a
 * tela precisa das duas metades para responder "estou dentro do orçamento?".
 *
 * Resposta obsoleta é descartada, não cancelada — mesmo motivo dos demais
 * hooks do produto.
 */
export function useOrcamentos(competencia, versao = 0) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(
    async (aindaVale = () => true) => {
      setCarregando(true);
      setErro(null);

      try {
        const { data } = await api.get("/orcamentos", {
          params: competencia ? { competencia } : {},
        });

        if (!aindaVale()) return;

        setOrcamentos(Array.isArray(data.data) ? data.data : []);
        setResumo(data.resumo ?? null);
      } catch (error) {
        if (!aindaVale()) return;

        setErro(extrairErro(error));
      } finally {
        if (aindaVale()) setCarregando(false);
      }
    },
    [competencia]
  );

  useEffect(() => {
    let atual = true;
    carregar(() => atual);

    return () => {
      atual = false;
    };
  }, [carregar, versao]);

  return { orcamentos, resumo, carregando, erro, recarregar: () => carregar() };
}
