import { useCallback, useMemo, useState } from "react";

/**
 * Estado dos dois selects encadeados: categoria e subcategoria.
 *
 * Existe como hook porque a mesma lógica vale no formulário de lançamento e em
 * qualquer outro ponto que precise escolher onde um gasto entra — e porque as
 * regras de borda são fáceis de esquecer quando escritas soltas dentro de um
 * componente:
 *
 *  - trocar a categoria LIMPA a subcategoria. Sem isso o formulário guardaria
 *    um id de "Aluguel" com "Transporte" selecionado, e o backend receberia uma
 *    combinação que a interface nunca mostrou;
 *  - a subcategoria é OPCIONAL. Um gasto genérico continua entrando direto em
 *    "Moradia", sem obrigar a inventar uma subcategoria "Outros";
 *  - ao EDITAR um lançamento que aponta para uma subcategoria, os dois selects
 *    precisam ser reconstruídos a partir de um id só — a categoria vem do pai.
 *
 * O que vai para a API é sempre `categoriaIdParaEnviar`: a subcategoria quando
 * há uma, senão a categoria. `gastos.categoria_id` continua sendo uma coluna só.
 */
export function useSelecaoDeCategoria(categorias) {
  const [categoriaId, definirCategoriaBruta] = useState("");
  const [subcategoriaId, definirSubcategoria] = useState("");

  const principais = useMemo(
    () => (categorias ?? []).filter((c) => !c.categoria_pai_id),
    [categorias]
  );

  const categoriaEscolhida = useMemo(
    () => principais.find((c) => String(c.id) === String(categoriaId)),
    [principais, categoriaId]
  );

  const subcategorias = useMemo(
    () => categoriaEscolhida?.subcategorias ?? [],
    [categoriaEscolhida]
  );

  const subcategoriaEscolhida = useMemo(
    () => subcategorias.find((s) => String(s.id) === String(subcategoriaId)),
    [subcategorias, subcategoriaId]
  );

  /** Trocar a categoria sempre limpa a subcategoria. */
  const definirCategoria = useCallback((valor) => {
    definirCategoriaBruta(valor);
    definirSubcategoria("");
  }, []);

  /**
   * Reconstrói os dois selects a partir do id gravado no lançamento.
   *
   * A busca é na árvore inteira porque o id pode ser de uma subcategoria — e é
   * o `categoria_pai_id` dela que diz qual categoria mostrar no primeiro select.
   */
  const definirPeloIdGravado = useCallback(
    (id) => {
      if (id == null || id === "") {
        definirCategoriaBruta("");
        definirSubcategoria("");
        return;
      }

      const alvo = String(id);

      const principal = principais.find((c) => String(c.id) === alvo);
      if (principal) {
        definirCategoriaBruta(alvo);
        definirSubcategoria("");
        return;
      }

      for (const mae of principais) {
        const filha = (mae.subcategorias ?? []).find((s) => String(s.id) === alvo);
        if (filha) {
          definirCategoriaBruta(String(mae.id));
          definirSubcategoria(alvo);
          return;
        }
      }

      // Categoria que sumiu do catálogo (excluída entre a carga e a edição):
      // melhor cair no estado vazio do que apontar para um id órfão.
      definirCategoriaBruta("");
      definirSubcategoria("");
    },
    [principais]
  );

  const limpar = useCallback(() => {
    definirCategoriaBruta("");
    definirSubcategoria("");
  }, []);

  return {
    categoriaId,
    subcategoriaId,
    principais,
    subcategorias,
    categoriaEscolhida,
    subcategoriaEscolhida,
    definirCategoria,
    definirSubcategoria,
    definirPeloIdGravado,
    limpar,
    // A subcategoria vence quando existe; a categoria é o padrão.
    categoriaIdParaEnviar: subcategoriaId || categoriaId,
    // O tipo vem sempre da raiz — a filha herda, então basta olhar a mãe.
    tipo: categoriaEscolhida?.tipo,
  };
}
