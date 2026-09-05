import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Relatório de um intervalo de competências.
 *
 * Evolução, ranking e composição 50/30/20 vêm de UMA requisição porque
 * precisam falar do mesmo intervalo: buscar cada peça separadamente deixaria a
 * tela mostrar períodos diferentes lado a lado enquanto carrega.
 *
 * Resposta obsoleta é descartada, não cancelada — trocar de intervalo depressa
 * chega a disparar três requisições, e abortar a única em voo já deixou uma
 * lista vazia na tela antes (Fase F).
 */
export function useRelatorio(de, ate, versao = 0) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(
    async (aindaVale = () => true) => {
      setCarregando(true);
      setErro(null);

      try {
        const params = {};
        if (de) params.de = de;
        if (ate) params.ate = ate;

        const resposta = await api.get("/relatorios", { params });

        if (!aindaVale()) return;

        setDados(resposta.data.data ?? null);
      } catch (error) {
        if (!aindaVale()) return;

        setErro(extrairErro(error));
      } finally {
        if (aindaVale()) setCarregando(false);
      }
    },
    [de, ate]
  );

  useEffect(() => {
    let atual = true;
    carregar(() => atual);

    return () => {
      atual = false;
    };
  }, [carregar, versao]);

  return { dados, carregando, erro, recarregar: () => carregar() };
}
