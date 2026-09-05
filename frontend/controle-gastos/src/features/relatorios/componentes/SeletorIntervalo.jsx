import { Select } from "../../../components/ui";
import { formatarCompetenciaCurta } from "../../../lib/format";
import "./relatorios.css";

/**
 * O valor selecionado é sempre uma opção, mesmo fora da lista de competências
 * com registro.
 *
 * Um intervalo digitado na URL — ou um link antigo — pode apontar para meses
 * sem dado. Sem esta garantia o `<select>` do "até" ficava com zero opções e
 * exibia um campo em branco: o usuário via o período errado na tela e nenhum
 * jeito de trocá-lo por ali.
 */
function comValorAtual(opcoes, valor) {
  if (!valor || opcoes.includes(valor)) return opcoes;

  return [...opcoes, valor].sort();
}

/**
 * Escolha do intervalo do relatório.
 *
 * As opções são as competências que EXISTEM, não um calendário livre: num
 * calendário aberto quase toda escolha cai num mês vazio, e o usuário conclui
 * que o relatório está quebrado. Mesma decisão do seletor do Dashboard.
 *
 * O fim nunca oferece um mês anterior ao início (e vice-versa): é mais honesto
 * não oferecer a combinação inválida do que aceitá-la e corrigir por baixo.
 */
export default function SeletorIntervalo({
  de,
  ate,
  competencias,
  onMudar,
  desabilitado = false,
}) {
  // Vêm da mais recente para a mais antiga; o seletor lê melhor ao contrário.
  const ordenadas = [...(competencias ?? [])].sort();

  if (ordenadas.length === 0) return null;

  const opcoesDe = comValorAtual(ordenadas.filter((c) => !ate || c <= ate), de);
  const opcoesAte = comValorAtual(ordenadas.filter((c) => !de || c >= de), ate);

  return (
    <div className="cf-intervalo">
      <label className="cf-intervalo__campo">
        <span className="cf-intervalo__rotulo">De</span>
        <Select
          value={de ?? ""}
          onChange={(e) => onMudar({ de: e.target.value, ate })}
          disabled={desabilitado}
          aria-label="Período inicial"
        >
          {opcoesDe.map((competencia) => (
            <option key={competencia} value={competencia}>
              {formatarCompetenciaCurta(competencia)}
            </option>
          ))}
        </Select>
      </label>

      <span className="cf-intervalo__ate" aria-hidden="true">
        até
      </span>

      <label className="cf-intervalo__campo">
        <span className="cf-intervalo__rotulo">Até</span>
        <Select
          value={ate ?? ""}
          onChange={(e) => onMudar({ de, ate: e.target.value })}
          disabled={desabilitado}
          aria-label="Período final"
        >
          {opcoesAte.map((competencia) => (
            <option key={competencia} value={competencia}>
              {formatarCompetenciaCurta(competencia)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
