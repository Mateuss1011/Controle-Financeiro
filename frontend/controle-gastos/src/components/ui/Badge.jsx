import "./Badge.css";

/**
 * Etiqueta de estado.
 *
 * Os tons `necessidade`, `desejo` e `poupanca` existem para que a classificação
 * da regra 50/30/20 tenha sempre a mesma cor, em qualquer tela.
 */
export default function Badge({ children, tom = "neutro", ponto = false, className = "" }) {
  return (
    <span className={`cf-badge cf-badge--${tom} ${className}`.trim()}>
      {ponto && <span className="cf-badge__ponto" aria-hidden="true" />}
      {children}
    </span>
  );
}
