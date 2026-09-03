import "./Card.css";

/**
 * Contêiner padrão de conteúdo.
 *
 * Um card só existe quando agrupa informação que pertence junta. O briefing pede
 * explicitamente para evitar "telas cheias de cards sem propósito", então a
 * elevação aqui é mínima: borda de 1px e sombra quase imperceptível.
 */
export default function Card({
  titulo,
  descricao,
  acao,
  children,
  rodape,
  semPadding = false,
  className = "",
  as: Tag = "section",
  ...props
}) {
  const temCabecalho = titulo || descricao || acao;

  return (
    <Tag className={`cf-card ${className}`.trim()} {...props}>
      {temCabecalho && (
        <header className="cf-card__cabecalho">
          <div className="cf-card__titulos">
            {titulo && <h2 className="cf-card__titulo">{titulo}</h2>}
            {descricao && <p className="cf-card__descricao">{descricao}</p>}
          </div>
          {acao && <div className="cf-card__acao">{acao}</div>}
        </header>
      )}

      <div className={semPadding ? "cf-card__corpo--nu" : "cf-card__corpo"}>
        {children}
      </div>

      {rodape && <footer className="cf-card__rodape">{rodape}</footer>}
    </Tag>
  );
}
