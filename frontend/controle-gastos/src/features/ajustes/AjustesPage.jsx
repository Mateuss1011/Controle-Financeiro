import { useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { Button, Card, Modal } from "../../components/ui";
import { PageHeader, Stack } from "../../components/layout";
import { useAuth } from "../auth/authContext";
import FormularioPerfil from "./componentes/FormularioPerfil";
import FormularioSenha from "./componentes/FormularioSenha";
import "./componentes/ajustes.css";

const FAIXAS = [
  {
    tipo: "necessidade",
    rotulo: "50% Necessidades",
    cor: "var(--cf-necessidade)",
    texto: "Moradia, mercado, transporte, contas — o que você não deixaria de pagar. É um teto.",
  },
  {
    tipo: "desejo",
    rotulo: "30% Desejos",
    cor: "var(--cf-desejo)",
    texto: "Lazer, delivery, assinaturas — o que melhora a vida mas pode esperar. Também é um teto.",
  },
  {
    tipo: "poupanca",
    rotulo: "20% Poupança",
    cor: "var(--cf-poupanca)",
    texto: "Investimentos, reserva, quitar dívida — dinheiro que continua sendo seu. Esta é uma meta, não um teto.",
  },
];

/**
 * Ajustes.
 *
 * Três coisas, nesta ordem: quem você é, como você entra, e como o aplicativo
 * chega nos números que mostra. A terceira não é enfeite — a regra 50/30/20
 * aparece em quase toda tela, e o usuário tem direito de saber de onde ela vem
 * e o que ela não é.
 */
export default function AjustesPage() {
  const { sair } = useAuth();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);

  async function confirmarSaida() {
    setSaindo(true);

    try {
      await sair();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Ajustes"
        descricao="Sua conta, sua senha e como os números são calculados."
      />

      <Stack gap="var(--cf-esp-5)">
        <FormularioPerfil />
        <FormularioSenha />

        <Card
          titulo="Como calculamos"
          descricao="A regra 50/30/20, usada no painel, nos orçamentos e nos relatórios."
        >
          <Stack gap="var(--cf-esp-4)">
            <dl className="cf-metodologia">
              {FAIXAS.map((faixa) => (
                <div key={faixa.tipo} className="cf-metodologia__item">
                  <span
                    className="cf-metodologia__marca"
                    style={{ background: faixa.cor }}
                    aria-hidden="true"
                  />
                  <dt className="cf-metodologia__rotulo">{faixa.rotulo}</dt>
                  <dd className="cf-metodologia__texto">{faixa.texto}</dd>
                </div>
              ))}
            </dl>

            <p className="cf-ajustes__nota">
              Cada lançamento entra numa dessas faixas pelo tipo da sua categoria
              — que você pode conferir e ajustar em Categorias. Os limites saem
              da renda registrada no período: sem renda cadastrada, nenhum limite
              é calculado, e a tela diz isso em vez de mostrar zero.
            </p>

            <p className="cf-ajustes__nota">
              Tudo o que o aplicativo mostra é aritmética sobre os dados que você
              registrou. Não é recomendação nem aconselhamento financeiro
              profissional.
            </p>
          </Stack>
        </Card>

        <Card titulo="Sessão">
          <Stack>
            <p className="cf-ajustes__nota">
              Sair encerra apenas esta sessão. Os outros dispositivos continuam
              conectados — para desconectar todos, troque a senha.
            </p>
            <div className="cf-ajustes__acoes">
              <Button
                variante="perigo"
                onClick={() => setConfirmandoSaida(true)}
                iconeEsquerda={<FiLogOut />}
              >
                Sair da conta
              </Button>
            </div>
          </Stack>
        </Card>
      </Stack>

      <Modal
        aberto={confirmandoSaida}
        onFechar={() => setConfirmandoSaida(false)}
        titulo="Sair da conta"
        rotuloConfirmar="Sair"
        varianteConfirmar="perigo"
        onConfirmar={confirmarSaida}
        confirmando={saindo}
      >
        <p>Você precisará entrar de novo com seu e-mail e senha.</p>
        <p className="cf-lancamentos__aviso-exclusao">
          Nenhum dado é apagado: seus lançamentos, rendas, orçamentos e metas
          continuam onde estão.
        </p>
      </Modal>
    </>
  );
}
