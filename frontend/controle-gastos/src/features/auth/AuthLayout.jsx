import "./auth.css";

/**
 * Moldura das telas de entrada.
 *
 * Deliberadamente sóbria: marca, um título claro, o formulário e nada mais.
 * Painéis de marketing ao lado do login costumam ser enfeite — num produto
 * financeiro, o que transmite confiança é a ausência de ruído.
 */
export default function AuthLayout({ titulo, descricao, children, rodape }) {
  return (
    <main className="cf-auth">
      <div className="cf-auth__caixa">
        <div className="cf-auth__marca">
          <span className="cf-auth__logo" aria-hidden="true">CF</span>
          <span className="cf-auth__produto">Controle Financeiro</span>
        </div>

        <div className="cf-auth__cartao">
          <h1 className="cf-auth__titulo">{titulo}</h1>
          {descricao && <p className="cf-auth__descricao">{descricao}</p>}

          {children}
        </div>

        {rodape && <p className="cf-auth__rodape">{rodape}</p>}
      </div>
    </main>
  );
}
