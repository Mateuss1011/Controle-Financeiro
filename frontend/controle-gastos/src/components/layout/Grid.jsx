import "./Grid.css";

/**
 * Grade responsiva do produto.
 *
 * Usa auto-fit com largura mínima em vez de breakpoints manuais: as colunas se
 * ajustam sozinhas de 375px a 1440px sem media query em cada tela.
 */
export function Grid({ minimo = "240px", gap = "var(--cf-esp-4)", children, className = "" }) {
  return (
    <div
      className={`cf-grid ${className}`.trim()}
      style={{ "--cf-grid-min": minimo, "--cf-grid-gap": gap }}
    >
      {children}
    </div>
  );
}

/** Empilhamento vertical com espaçamento consistente. */
export function Stack({ gap = "var(--cf-esp-4)", children, className = "" }) {
  return (
    <div className={`cf-stack ${className}`.trim()} style={{ "--cf-stack-gap": gap }}>
      {children}
    </div>
  );
}

export default Grid;
