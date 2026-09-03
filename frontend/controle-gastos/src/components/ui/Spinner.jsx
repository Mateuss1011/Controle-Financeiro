import "./Spinner.css";

export default function Spinner({ tamanho = 20, rotulo = "Carregando" }) {
  return (
    <span
      className="cf-spinner"
      style={{ width: tamanho, height: tamanho }}
      role="status"
    >
      <span className="cf-sr-only">{rotulo}</span>
    </span>
  );
}
