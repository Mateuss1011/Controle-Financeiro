import SalarioMensal from "../components/SalarioMensal";
import { PageHeader } from "../components/layout";

/**
 * Renda do período.
 *
 * A tela antiga de "Controle" juntava renda, formulário de gasto, resumo, regra
 * 50/30/20 e lista de lançamentos numa página só. Resumo e regra passaram para o
 * Dashboard; formulário e lista, para Lançamentos. Sobra aqui a renda — que
 * ganha tela própria na fase seguinte.
 */
export default function Renda() {
  return (
    <>
      <PageHeader
        titulo="Renda"
        descricao="Quanto você recebeu no período. É a base de todos os limites e da sua saúde financeira."
      />

      <div style={{ maxWidth: 460 }}>
        <SalarioMensal />
      </div>
    </>
  );
}
