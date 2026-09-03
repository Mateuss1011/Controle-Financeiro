import SalarioMensal from "../components/SalarioMensal";
import Resumo from "../components/Resumo";
import AdicionarGasto from "../components/AdicionarGasto";
import Regra from "../components/Regra";
import Lancamentos from "../components/Lancamentos";
import { PageHeader } from "../components/layout";

export default function Controle() {
  return (
    <div>
      <PageHeader
        titulo="Lançamentos"
        descricao="Registre sua renda e acompanhe os gastos do mês."
      />

      {/* Linha 1 */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <SalarioMensal />
        </div>
        <div className="col-md-6 mb-3">
          <Resumo />
        </div>
      </div>

      {/* Linha 2 */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <AdicionarGasto />
        </div>
        <div className="col-md-6 mb-3">
          <Regra />
        </div>
      </div>

      {/* Linha 3 */}
      <div className="row">
        <div className="col-12">
          <Lancamentos />
        </div>
      </div>
    </div>
  );
}
