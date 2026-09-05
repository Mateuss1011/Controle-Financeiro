import Spinner from "../ui/Spinner";
import "./CarregandoTela.css";

/**
 * Espera pela chegada do código de uma tela carregada sob demanda.
 *
 * Vive DENTRO da casca, no lugar do conteúdo: a barra lateral, a navegação
 * inferior e o botão de novo lançamento continuam na tela enquanto o chunk
 * baixa. Uma tela em branco por alguns instantes é indistinguível de um
 * travamento, e o usuário clica de novo.
 *
 * Altura mínima para o rodapé não subir e descer a cada navegação — o pulo
 * chamaria mais atenção que o próprio carregamento.
 */
export default function CarregandoTela() {
  return (
    // O `role="status"` fica só aqui. O Spinner tem um proprio, com rótulo
    // para leitor de tela; aninhados, os dois anunciariam a mesma espera duas
    // vezes. Aqui o rótulo dele vai vazio e quem é anunciado é o texto visível.
    <div className="cf-carregando-tela" role="status">
      <Spinner tamanho={26} rotulo="" />
      <p className="cf-carregando-tela__texto">Carregando…</p>
    </div>
  );
}
