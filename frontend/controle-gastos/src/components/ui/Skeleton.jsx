import "./Skeleton.css";

/** Placeholder de carregamento. Preserva a altura para a tela não pular. */
export default function Skeleton({
  largura = "100%",
  altura = "1rem",
  raio = "var(--cf-raio-sm)",
  className = "",
}) {
  return (
    <span
      className={`cf-skeleton ${className}`.trim()}
      style={{ width: largura, height: altura, borderRadius: raio }}
      aria-hidden="true"
    />
  );
}

/** Bloco de N linhas de texto, a última mais curta, como texto real. */
export function SkeletonTexto({ linhas = 3 }) {
  return (
    <div className="cf-skeleton-texto">
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} largura={i === linhas - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
