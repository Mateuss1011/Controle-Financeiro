import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Metas do usuário, já com percentual, restante e aporte mensal calculados.
 *
 * Nada é recalculado aqui: as regras de borda (meta sem prazo, prazo vencido,
 * objetivo zero) valem também para a estimativa de "quanto posso gastar", e
 * duplicá-las no cliente seria pedir para as duas telas divergirem.
 *
 * Resposta obsoleta é descartada, não cancelada — mesmo motivo dos demais
 * hooks do produto.
 */
export function useMetas(versao = 0) {
  const [metas, setMetas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async (aindaVale = () => true) => {
    setCarregando(true);
    setErro(null);

    try {
      const { data } = await api.get("/metas");

      if (!aindaVale()) return;

      setMetas(Array.isArray(data.data) ? data.data : []);
      setResumo(data.resumo ?? null);
    } catch (error) {
      if (!aindaVale()) return;

      setErro(extrairErro(error));
    } finally {
      if (aindaVale()) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let atual = true;
    carregar(() => atual);

    return () => {
      atual = false;
    };
  }, [carregar, versao]);

  return { metas, resumo, carregando, erro, recarregar: () => carregar() };
}
