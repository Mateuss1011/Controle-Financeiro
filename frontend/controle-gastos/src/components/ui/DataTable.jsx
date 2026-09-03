import EmptyState from "./EmptyState";
import { SkeletonTexto } from "./Skeleton";
import "./DataTable.css";

/**
 * Tabela de dados com os três estados resolvidos: carregando, vazia e com
 * conteúdo. A rolagem horizontal fica presa ao contêiner — a página nunca
 * rola de lado no celular.
 */
export default function DataTable({
  colunas,
  dados,
  carregando = false,
  chave = (linha) => linha.id,
  vazio,
}) {
  if (carregando) {
    return (
      <div className="cf-tabela__carregando">
        <SkeletonTexto linhas={5} />
      </div>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      vazio ?? (
        <EmptyState
          compacto
          titulo="Nada por aqui ainda"
          descricao="Quando houver registros, eles aparecem nesta lista."
        />
      )
    );
  }

  return (
    <div className="cf-tabela__scroll">
      <table className="cf-tabela">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                scope="col"
                style={{ textAlign: coluna.alinhamento ?? "left", width: coluna.largura }}
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((linha) => (
            <tr key={chave(linha)}>
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  style={{ textAlign: coluna.alinhamento ?? "left" }}
                  data-rotulo={coluna.titulo}
                >
                  {coluna.render ? coluna.render(linha) : linha[coluna.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
