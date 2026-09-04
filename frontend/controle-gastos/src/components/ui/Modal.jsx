import { useId } from "react";
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
  confirmarDesabilitado = false,
  confirmando = false,
  varianteConfirmar = "primario",
  tamanho,
}) {
  const idTitulo = useId();

  return (
    <ModalBootstrap
      show={aberto}
      onHide={onFechar}
      centered
      size={tamanho}
      backdrop={confirmando ? "static" : true}
      aria-labelledby={idTitulo}
    >
      <ModalBootstrap.Header closeButton>
        {/* `as="h2"` porque o Modal.Title do react-bootstrap renderiza uma div:
            o título de um diálogo precisa ser um heading de verdade, e é ele que
            dá nome ao diálogo via aria-labelledby. */}
        <ModalBootstrap.Title as="h2" id={idTitulo}>
          {titulo}
        </ModalBootstrap.Title>
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
            disabled={confirmarDesabilitado}
          >
            {rotuloConfirmar}
          </Button>
        </ModalBootstrap.Footer>
      )}
    </ModalBootstrap>
  );
}
