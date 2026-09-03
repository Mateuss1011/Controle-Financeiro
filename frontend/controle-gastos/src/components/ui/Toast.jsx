import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./toastContext";
import "./Toast.css";

/**
 * Feedback efêmero de ação concluída.
 *
 * A região é aria-live="polite": o leitor de tela anuncia sem interromper o que
 * o usuário está fazendo. Erros usam role="alert" para terem prioridade.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remover = useCallback((id) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensagem, tom = "positivo", duracao = 4000) => {
      const id = crypto.randomUUID();
      setToasts((atuais) => [...atuais, { id, mensagem, tom }]);

      if (duracao > 0) {
        setTimeout(() => remover(id), duracao);
      }

      return id;
    },
    [remover]
  );

  const valor = useMemo(
    () => ({
      mostrar,
      sucesso: (m) => mostrar(m, "positivo"),
      erro: (m) => mostrar(m, "negativo", 6000),
      aviso: (m) => mostrar(m, "atencao"),
      remover,
    }),
    [mostrar, remover]
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}

      <div className="cf-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`cf-toast cf-toast--${toast.tom}`}
            role={toast.tom === "negativo" ? "alert" : "status"}
          >
            <span className="cf-toast__mensagem">{toast.mensagem}</span>
            <button
              type="button"
              className="cf-toast__fechar"
              onClick={() => remover(toast.id)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
