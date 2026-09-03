import "./Field.css";

export function Input({ prefixo, className = "", ...props }) {
  const input = (
    <input className={`cf-input ${className}`.trim()} {...props} />
  );

  if (!prefixo) return input;

  return (
    <div className="cf-input-prefixado">
      <span className="cf-input-prefixado__prefixo">{prefixo}</span>
      {input}
    </div>
  );
}

/** Campo monetário: prefixo R$, teclado numérico no celular, passo de centavo. */
export function InputMoeda(props) {
  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      placeholder="0,00"
      prefixo="R$"
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`cf-select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export default Input;
