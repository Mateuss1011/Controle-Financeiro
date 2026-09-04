import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Carrega o Dashboard inteiro numa requisição só.
 *
 * `competencia` nula significa "deixe o servidor escolher": ele devolve o
 * período mais recente com dados. Isso evita o vaivém de pedir a lista de
 * competências, decidir no cliente e só então buscar os números.
 *
 * Respostas obsoletas são descartadas em vez de canceladas — ver a mesma
 * explicação em useListaLancamentos: abortar na limpeza do efeito matava a
 * única requisição em voo e deixava a tela vazia.
 */
export function useDashboard(competencia, versao = 0) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(
    async (aindaVale = () => true) => {
      setCarregando(true);
      setErro(null);

      try {
        const { data } = await api.get("/dashboard", {
          params: competencia ? { competencia } : {},
        });

        if (!aindaVale()) return;

        setDados(data.data);
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

  return { dados, carregando, erro, recarregar: () => carregar() };
}
