import { Modal as ModalBootstrap } from "react-bootstrap";
import Button from "./Button";

/**
 * Modal do produto.
 *
 * Envolve o Modal do react-bootstrap em vez de reimplementá-lo: foco preso,
 * fechar com Esc, aria-modal e rolagem travada no fundo já vêm resolvidos e bem
 * testados. A aparência vem dos tokens, via theme.css.
 */
export default function Modal({
  aberto,
  onFechar,
  titulo,
  children,
  rotuloConfirmar = "Salvar",
  onConfirmar,
  confirmando = false,
  varianteConfirmar = "primario",
  tamanho,
}) {
  return (
    <ModalBootstrap
      show={aberto}
      onHide={onFechar}
      centered
      size={tamanho}
      backdrop={confirmando ? "static" : true}
    >
      <ModalBootstrap.Header closeButton>
        <ModalBootstrap.Title>{titulo}</ModalBootstrap.Title>
      </ModalBootstrap.Header>

      <ModalBootstrap.Body>{children}</ModalBootstrap.Body>

      {onConfirmar && (
        <ModalBootstrap.Footer>
          <Button variante="secundario" onClick={onFechar} disabled={confirmando}>
            Cancelar
          </Button>
          <Button
            variante={varianteConfirmar}
            onClick={onConfirmar}
            carregando={confirmando}
          >
            {rotuloConfirmar}
          </Button>
        </ModalBootstrap.Footer>
      )}
    </ModalBootstrap>
  );
}
