import "./Button.css";

/**
 * Botão do produto.
 *
 * `<button>` de verdade, não uma div clicável: teclado, foco e leitores de tela
 * funcionam sem trabalho extra. Enquanto `carregando`, fica desabilitado e
 * anuncia o estado com aria-busy.
 */
export default function Button({
  children,
  variante = "primario",
  tamanho = "md",
  carregando = false,
  iconeEsquerda = null,
  iconeDireita = null,
  larguraTotal = false,
  type = "button",
  className = "",
  disabled = false,
  ...props
}) {
  const classes = [
    "cf-btn",
    `cf-btn--${variante}`,
    `cf-btn--${tamanho}`,
    larguraTotal ? "cf-btn--bloco" : "",
    carregando ? "cf-btn--carregando" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && <span className="cf-btn__spinner" aria-hidden="true" />}
      {!carregando && iconeEsquerda && (
        <span className="cf-btn__icone" aria-hidden="true">{iconeEsquerda}</span>
      )}
      <span className="cf-btn__rotulo">{children}</span>
      {!carregando && iconeDireita && (
        <span className="cf-btn__icone" aria-hidden="true">{iconeDireita}</span>
      )}
    </button>
  );
}
