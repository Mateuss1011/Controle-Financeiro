import "./PageHeader.css";

/** Cabeçalho de página: título, apoio e ações. Um <h1> por tela. */
export default function PageHeader({ titulo, descricao, acoes, aside }) {
  return (
    <header className="cf-pagehead">
      <div className="cf-pagehead__linha">
        <div className="cf-pagehead__titulos">
          <h1 className="cf-pagehead__titulo">{titulo}</h1>
          {descricao && <p className="cf-pagehead__descricao">{descricao}</p>}
        </div>
        {acoes && <div className="cf-pagehead__acoes">{acoes}</div>}
      </div>
      {aside}
    </header>
  );
}
