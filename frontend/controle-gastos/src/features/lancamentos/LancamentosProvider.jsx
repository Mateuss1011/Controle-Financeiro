import { useCallback, useMemo, useState } from "react";
import { useToast } from "../../components/ui";
import FormularioLancamento from "./componentes/FormularioLancamento";
import { LancamentosContext } from "./lancamentosContext";

/**
 * Formulário de lançamento disponível em toda a área autenticada.
 *
 * Ele vive aqui, e não dentro da tela de Lançamentos, porque "+ Novo
 * lançamento" é uma ação da casca: o usuário deve poder registrar um gasto
 * estando no Dashboard, na lista ou em qualquer outra tela. Como o formulário é
 * único, o comportamento é idêntico em todos os lugares.
 */
export default function LancamentosProvider({ children }) {
  const toast = useToast();

  const [formulario, setFormulario] = useState({ aberto: false, gasto: null });
  const [versao, setVersao] = useState(0);

  const abrirNovo = useCallback(() => {
    setFormulario({ aberto: false, gasto: null });
    // Um tick para o modal remontar limpo quando já estava aberto em edição.
    queueMicrotask(() => setFormulario({ aberto: true, gasto: null }));
  }, []);

  const abrirEdicao = useCallback((gasto) => {
    setFormulario({ aberto: true, gasto });
  }, []);

  /**
   * Duplicar reaproveita descrição, valor e categoria de um lançamento e traz a
   * data para hoje. Contas que se repetem todo mês — aluguel, assinatura,
   * mensalidade — deixam de exigir digitação repetida.
   */
  const duplicar = useCallback((gasto) => {
    setFormulario({
      aberto: true,
      gasto: {
        ...gasto,
        id: null,
        data_lancamento: new Date().toISOString().slice(0, 10),
      },
    });
  }, []);

  const fechar = useCallback(() => {
    setFormulario({ aberto: false, gasto: null });
  }, []);

  const aoSalvar = useCallback(
    (mensagem) => {
      setVersao((v) => v + 1);
      fechar();
      toast.sucesso(mensagem);
    },
    [fechar, toast]
  );

  /** Chamada por quem exclui um lançamento fora do formulário. */
  const notificarMudanca = useCallback(() => setVersao((v) => v + 1), []);

  const valor = useMemo(
    () => ({ abrirNovo, abrirEdicao, duplicar, notificarMudanca, versao }),
    [abrirNovo, abrirEdicao, duplicar, notificarMudanca, versao]
  );

  return (
    <LancamentosContext.Provider value={valor}>
      {children}

      <FormularioLancamento
        aberto={formulario.aberto}
        gasto={formulario.gasto}
        onFechar={fechar}
        onSalvo={aoSalvar}
      />
    </LancamentosContext.Provider>
  );
}
