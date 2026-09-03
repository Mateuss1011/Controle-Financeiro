import { FiCalendar } from "react-icons/fi";
import { Select } from "../../../components/ui";
import { competenciaAtual, formatarCompetencia } from "../../../lib/format";
import "./dashboard.css";

/**
 * Seleção de período.
 *
 * Oferece as competências que TÊM dados, mais o mês corrente. Um calendário
 * livre convidaria o usuário a abrir meses vazios; a lista mostra onde há o que
 * ver. O mês corrente entra sempre, porque é onde ele vai lançar hoje.
 */
export default function SeletorCompetencia({ valor, competencias, onMudar, desabilitado }) {
  const atual = competenciaAtual();
  const opcoes = [...new Set([atual, ...(competencias ?? [])])].sort().reverse();

  return (
    <div className="cf-seletor">
      <FiCalendar className="cf-seletor__icone" aria-hidden="true" />
      <Select
        aria-label="Período exibido"
        value={valor ?? atual}
        onChange={(evento) => onMudar(evento.target.value)}
        disabled={desabilitado}
        className="cf-seletor__campo"
      >
        {opcoes.map((competencia) => (
          <option key={competencia} value={competencia}>
            {formatarCompetencia(competencia)}
            {competencia === atual ? " (atual)" : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
