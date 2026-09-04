import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Listagem de lançamentos com filtros, ordenação e paginação.
 *
 * Os filtros chegam prontos (vindos da URL) e são repassados à API sem
 * tratamento: quem filtra é o backend. O cliente não recorta nem soma nada — o
 * total do resultado vem no `resumo` da resposta, porque somar só a página
 * visível responderia a pergunta errada.
 *
 * Respostas obsoletas são DESCARTADAS, não canceladas. Abortar a requisição na
 * limpeza do efeito parecia mais econômico, mas com o duplo disparo de efeitos
 * do StrictMode a limpeza às vezes matava a única requisição em voo e a lista
 * ficava vazia com dados existindo no servidor. Uma resposta ignorada custa
 * alguns bytes; uma tela vazia por engano custa a confiança do usuário.
 */
export function useListaLancamentos(filtros, versao) {
  const [lancamentos, setLancamentos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const chave = JSON.stringify(filtros);

  const carregar = useCallback(
    async (aindaVale = () => true) => {
      setCarregando(true);
      setErro(null);

      try {
        const params = Object.fromEntries(
          Object.entries(JSON.parse(chave)).filter(([, valor]) => valor !== "" && valor != null)
        );

        const { data } = await api.get("/gastos", { params });

        if (!aindaVale()) return;

        setLancamentos(data.data);
        setPaginacao(data.meta);
        setTotal(data.resumo?.total ?? 0);
      } catch (error) {
        if (!aindaVale()) return;

        setErro(extrairErro(error));
      } finally {
        if (aindaVale()) setCarregando(false);
      }
    },
    [chave]
  );

  useEffect(() => {
    let atual = true;
    carregar(() => atual);

    return () => {
      atual = false;
    };
  }, [carregar, versao]);

  return {
    lancamentos,
    paginacao,
    total,
    carregando,
    erro,
    recarregar: () => carregar(),
  };
}
