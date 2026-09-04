import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { extrairErro } from "../../lib/erros";

/**
 * Histórico de rendas e o contexto que a lista sozinha não conta.
 *
 * Como nos demais hooks do produto, resposta obsoleta é descartada em vez de
 * cancelada: abortar na limpeza do efeito já derrubou a única busca em voo e
 * deixou tela vazia com dados existindo no servidor.
 */
export function useRendas(versao = 0) {
  const [rendas, setRendas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async (aindaVale = () => true) => {
    setCarregando(true);
    setErro(null);

    try {
      const { data } = await api.get("/rendas");

      if (!aindaVale()) return;

      setRendas(Array.isArray(data.data) ? data.data : []);
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

  return { rendas, resumo, carregando, erro, recarregar: () => carregar() };
}
