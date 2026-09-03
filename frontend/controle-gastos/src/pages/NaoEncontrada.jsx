import { useNavigate } from "react-router-dom";
import { FiCompass } from "react-icons/fi";
import { EmptyState } from "../components/ui";

export default function NaoEncontrada() {
  const navegar = useNavigate();

  return (
    <EmptyState
      icone={<FiCompass />}
      titulo="Página não encontrada"
      descricao="O endereço que você abriu não existe ou ainda não faz parte do produto."
      acaoRotulo="Ir para o Dashboard"
      onAcao={() => navegar("/dashboard")}
    />
  );
}
