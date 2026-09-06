import { useEffect, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { Button, Input, Select } from "../../../components/ui";
import { competenciaAtual, formatarCompetencia } from "../../../lib/format";
import "./lancamentos.css";

const TIPOS = [
  { valor: "", rotulo: "Todos" },
  { valor: "necessidade", rotulo: "Necessidades" },
  { valor: "desejo", rotulo: "Desejos" },
  { valor: "poupanca", rotulo: "Poupança" },
];

const ORDENACOES = [
  { valor: "data:desc", rotulo: "Mais recentes" },
  { valor: "data:asc", rotulo: "Mais antigos" },
  { valor: "valor:desc", rotulo: "Maior valor" },
  { valor: "valor:asc", rotulo: "Menor valor" },
  { valor: "descricao:asc", rotulo: "Descrição (A–Z)" },
];

/** Últimos 12 meses, do mais recente para o mais antigo. */
function ultimosMeses(quantidade = 12) {
  const meses = [];
  const hoje = new Date();

  for (let i = 0; i < quantidade; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return meses;
}

export default function FiltrosLancamentos({ filtros, categorias, onMudar, onLimpar, temFiltro }) {
  // A busca é local até o usuário parar de digitar: sem isso, cada tecla
  // dispararia uma requisição.
  const [busca, setBusca] = useState(filtros.busca ?? "");

  useEffect(() => setBusca(filtros.busca ?? ""), [filtros.busca]);

  useEffect(() => {
    if ((filtros.busca ?? "") === busca) return;

    const temporizador = setTimeout(() => onMudar({ busca, pagina: 1 }), 350);

    return () => clearTimeout(temporizador);
  }, [busca, filtros.busca, onMudar]);

  const meses = [...new Set([competenciaAtual(), ...ultimosMeses()])];

  return (
    <div className="cf-filtros">
      <div className="cf-filtros__busca">
        <FiSearch className="cf-filtros__lupa" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Buscar por descrição"
          placeholder="Buscar por descrição…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Atalho de um toque para a pergunta mais frequente: "quanto foi para
          desejos?". O mesmo estado também existe no seletor completo abaixo. */}
      <div className="cf-chips" role="group" aria-label="Filtrar por tipo">
        {TIPOS.map((tipo) => (
          <button
            key={tipo.valor || "todos"}
            type="button"
            className={`cf-chip ${filtros.tipo === tipo.valor ? "cf-chip--ativo" : ""} ${
              tipo.valor ? `cf-chip--${tipo.valor}` : ""
            }`}
            onClick={() => onMudar({ tipo: tipo.valor, pagina: 1 })}
            aria-pressed={filtros.tipo === tipo.valor}
          >
            {tipo.rotulo}
          </button>
        ))}
      </div>

      <div className="cf-filtros__selects">
        <Select
          aria-label="Período"
          value={filtros.competencia ?? ""}
          onChange={(e) => onMudar({ competencia: e.target.value, pagina: 1 })}
        >
          <option value="">Todos os períodos</option>
          {meses.map((mes) => (
            <option key={mes} value={mes}>
              {formatarCompetencia(mes)}
            </option>
          ))}
        </Select>

        {/*
          * O filtro é por categoria PRINCIPAL, e traz a árvore inteira: escolher
          * "Moradia" devolve o que está direto nela e o que está em qualquer
          * subcategoria. Filtrar por subcategoria isolada é uma pergunta bem mais
          * rara que "quanto foi para moradia neste mês".
          */}
        <Select
          aria-label="Categoria"
          value={filtros.categoria_id ?? ""}
          onChange={(e) => onMudar({ categoria_id: e.target.value, pagina: 1 })}
        >
          <option value="">Todas as categorias</option>
          {(categorias ?? [])
            .filter((categoria) => !categoria.categoria_pai_id)
            .map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
        </Select>

        <Select
          aria-label="Ordenar por"
          value={`${filtros.ordenar_por ?? "data"}:${filtros.direcao ?? "desc"}`}
          onChange={(e) => {
            const [ordenar_por, direcao] = e.target.value.split(":");
            onMudar({ ordenar_por, direcao, pagina: 1 });
          }}
        >
          {ORDENACOES.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </Select>

        {temFiltro && (
          <Button
            variante="fantasma"
            tamanho="sm"
            onClick={onLimpar}
            iconeEsquerda={<FiX />}
          >
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
