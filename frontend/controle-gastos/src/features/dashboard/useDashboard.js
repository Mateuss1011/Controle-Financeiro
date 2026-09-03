import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Carrega o Dashboard inteiro numa requisição só.
 *
 * `competencia` nula significa "deixe o servidor escolher": ele devolve o
 * período mais recente com dados. Isso evita o vaivém de pedir a lista de
 * competências, decidir no cliente e só então buscar os números.
 */
export function useDashboard(competencia) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async (sinal) => {
    setCarregando(true);
    setErro(null);

    try {
      const { data } = await api.get("/dashboard", {
        params: competencia ? { competencia } : {},
        signal: sinal,
      });

      setDados(data.data);
    } catch (error) {
      if (error?.code === "ERR_CANCELED") return;

      setErro(extrairErro(error));
    } finally {
      setCarregando(false);
    }
  }, [competencia]);

  useEffect(() => {
    const controlador = new AbortController();
    carregar(controlador.signal);

    return () => controlador.abort();
  }, [carregar]);

  return { dados, carregando, erro, recarregar: () => carregar() };
}
