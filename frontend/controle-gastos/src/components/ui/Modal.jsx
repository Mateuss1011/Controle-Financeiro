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
  const idCorpo = useId();

  return (
    <ModalBootstrap
      show={aberto}
      onHide={onFechar}
      centered
      size={tamanho}
      backdrop={confirmando ? "static" : true}
      aria-labelledby={idTitulo}
      /* O título diz QUAL diálogo é; o corpo diz o que está em jogo. Nos
         modais de exclusão é no corpo que mora o que se perde — e sem
         aria-describedby um leitor de tela anuncia só "Excluir categoria" e
         para. */
      aria-describedby={idCorpo}
    >
      <ModalBootstrap.Header closeButton>
        {/* `as="h2"` porque o Modal.Title do react-bootstrap renderiza uma div:
            o título de um diálogo precisa ser um heading de verdade, e é ele que
            dá nome ao diálogo via aria-labelledby. */}
        <ModalBootstrap.Title as="h2" id={idTitulo}>
          {titulo}
        </ModalBootstrap.Title>
      </ModalBootstrap.Header>

      <ModalBootstrap.Body id={idCorpo}>{children}</ModalBootstrap.Body>

      {/*
        * O rodapé é sempre renderizado, e só o botão de confirmar é condicional.
        *
        * Antes o rodapé inteiro dependia de `onConfirmar`, e um diálogo sem
        * ação de confirmação perdia junto o "Cancelar" — restando só o X do
        * canto como saída. Não é hipótese: causou bug na Fase H (formulário
        * incompleto) e de novo na Fase J (exclusão bloqueada). Uma saída visível
        * não pode depender de existir uma ação de entrada.
        */}
      <ModalBootstrap.Footer>
        <Button variante="secundario" onClick={onFechar} disabled={confirmando}>
          Cancelar
        </Button>
        {onConfirmar && (
          <Button
            variante={varianteConfirmar}
            onClick={onConfirmar}
            carregando={confirmando}
            disabled={confirmarDesabilitado}
          >
            {rotuloConfirmar}
          </Button>
        )}
      </ModalBootstrap.Footer>
    </ModalBootstrap>
  );
}
