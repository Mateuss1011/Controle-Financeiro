import { useState } from "react";
import { FiInbox, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  InputMoeda,
  Modal,
  Money,
  ProgressBar,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  useToast,
} from "../components/ui";
import { AppShell, Grid, PageHeader, Stack } from "../components/layout";
import { formatarCompetencia, formatarData, percentualSeguro } from "../lib/format";

/**
 * Guia vivo do Design System.
 *
 * Serve para dois propósitos: conferir visualmente todos os estados de todos os
 * componentes num só lugar, e documentar como cada um deve ser usado. Fica fora
 * do build de produção (ver App.jsx).
 */
export default function DesignSystem() {
  const toast = useToast();
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [valor, setValor] = useState("");

  const lancamentos = [
    { id: 1, descricao: "Supermercado", valor: 820.5, data: "2026-09-02", tipo: "necessidade" },
    { id: 2, descricao: "Cinema", valor: 68, data: "2026-09-05", tipo: "desejo" },
    { id: 3, descricao: "Aporte CDB", valor: 400, data: "2026-09-05", tipo: "poupanca" },
  ];

  return (
    <AppShell
      usuario={{ name: "Lucas Almeida", email: "lucas@exemplo.com" }}
      onSair={() => toast.aviso("Sair da conta")}
      onNovoLancamento={() => setModalAberto(true)}
    >
      <PageHeader
        titulo="Design System"
        descricao="Guia vivo dos tokens e componentes do Controle Financeiro."
        acoes={<Button variante="secundario" onClick={() => toast.sucesso("Tudo certo por aqui!")}>Testar toast</Button>}
      />

      <Stack gap="var(--cf-esp-8)">
        {/* ------------------------------------------------------------ Cores */}
        <Card titulo="Cores" descricao="Neutros de tinta, um acento e as três faixas da regra 50/30/20.">
          <Stack>
            <Amostras titulo="Acento e neutros" cores={[
              ["--cf-brand-600", "Acento"],
              ["--cf-ink-900", "Tinta"],
              ["--cf-ink-500", "Texto suave"],
              ["--cf-ink-200", "Borda"],
              ["--cf-ink-50", "Fundo"],
            ]} />
            <Amostras titulo="Semânticos" cores={[
              ["--cf-positivo-600", "Positivo"],
              ["--cf-negativo-600", "Negativo"],
              ["--cf-atencao-600", "Atenção"],
              ["--cf-info-600", "Informação"],
            ]} />
            <Amostras titulo="Faixas 50/30/20" cores={[
              ["--cf-necessidade", "Necessidade"],
              ["--cf-desejo", "Desejo"],
              ["--cf-poupanca", "Poupança"],
            ]} />
          </Stack>
        </Card>

        {/* ------------------------------------------------------- Tipografia */}
        <Card titulo="Tipografia" descricao="Poppins, com numerais tabulares nos valores.">
          <Stack gap="var(--cf-esp-3)">
            <div style={{ fontSize: "var(--cf-texto-2xl)", fontWeight: 700 }}>Título de página · 24px/700</div>
            <div style={{ fontSize: "var(--cf-texto-xl)", fontWeight: 600 }}>Título de seção · 20px/600</div>
            <div style={{ fontSize: "var(--cf-texto-lg)", fontWeight: 600 }}>Destaque · 16px/600</div>
            <div>Corpo padrão · 14px/400. O texto de leitura da interface.</div>
            <div style={{ fontSize: "var(--cf-texto-sm)", color: "var(--cf-texto-suave)" }}>Apoio · 13px, cor suave</div>
            <div style={{ fontSize: "var(--cf-texto-xs)", color: "var(--cf-texto-fraco)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Rótulo · 12px caixa alta</div>
          </Stack>
        </Card>

        {/* ---------------------------------------------------------- Botões */}
        <Card titulo="Botões">
          <Stack>
            <Linha>
              <Button variante="primario">Primário</Button>
              <Button variante="secundario">Secundário</Button>
              <Button variante="fantasma">Fantasma</Button>
              <Button variante="perigo">Excluir</Button>
            </Linha>
            <Linha>
              <Button tamanho="sm">Pequeno</Button>
              <Button tamanho="md">Médio</Button>
              <Button tamanho="lg">Grande</Button>
            </Linha>
            <Linha>
              <Button iconeEsquerda={<FiPlus />}>Com ícone</Button>
              <Button carregando>Salvando</Button>
              <Button disabled>Desabilitado</Button>
              <Button variante="perigo" iconeEsquerda={<FiTrash2 />} tamanho="sm">Excluir</Button>
            </Linha>
          </Stack>
        </Card>

        {/* --------------------------------------------------------- Valores */}
        <Card titulo="Valores monetários" descricao="Formatação única em todo o produto.">
          <Grid minimo="180px">
            <Stack gap="var(--cf-esp-2)">
              <Rotulo>Tamanhos</Rotulo>
              <Money valor={2086.65} tamanho="sm" />
              <Money valor={2086.65} tamanho="md" />
              <Money valor={2086.65} tamanho="lg" />
              <Money valor={2086.65} tamanho="xl" />
            </Stack>
            <Stack gap="var(--cf-esp-2)">
              <Rotulo>Tom automático</Rotulo>
              <Money valor={4679.5} tom="automatico" />
              <Money valor={-320.9} tom="automatico" />
              <Money valor={0} tom="suave" />
            </Stack>
            <Stack gap="var(--cf-esp-2)">
              <Rotulo>Formatadores</Rotulo>
              <span>{formatarData("2026-09-02")}</span>
              <span>{formatarCompetencia("2026-09")}</span>
              <span>Renda 0 → {percentualSeguro(500, 0)}% (sem Infinity)</span>
            </Stack>
          </Grid>
        </Card>

        {/* ----------------------------------------------------- Indicadores */}
        <Card titulo="Indicadores financeiros">
          <Grid minimo="200px">
            <StatCard rotulo="Renda" valor={5500} destaque detalhe="setembro de 2026" />
            <StatCard rotulo="Gastos" valor={3900} tomValor="negativo" detalhe="70,9% da renda" />
            <StatCard rotulo="Saldo" valor={1600} tomValor="positivo" />
            <StatCard rotulo="Carregando" valor={0} carregando />
          </Grid>
        </Card>

        {/* -------------------------------------------------------- Etiquetas */}
        <Card titulo="Etiquetas">
          <Linha>
            <Badge>Neutro</Badge>
            <Badge tom="positivo" ponto>Dentro do limite</Badge>
            <Badge tom="atencao" ponto>Atenção</Badge>
            <Badge tom="negativo" ponto>Estourado</Badge>
            <Badge tom="marca">Meta atingida</Badge>
            <Badge tom="necessidade">Necessidade</Badge>
            <Badge tom="desejo">Desejo</Badge>
            <Badge tom="poupanca">Poupança</Badge>
          </Linha>
        </Card>

        {/* -------------------------------------------------------- Progresso */}
        <Card titulo="Progresso" descricao="A barra satura em 100%; o número continua informando o excesso.">
          <Stack>
            <ProgressBar rotulo="Necessidades" valor={76.4} tom="necessidade" />
            <ProgressBar rotulo="Desejos" valor={109.1} tom="desejo" />
            <ProgressBar rotulo="Poupança" valor={100} tom="poupanca" />
            <ProgressBar rotulo="Renda zero (denominador 0)" valor={percentualSeguro(500, 0)} tom="marca" />
          </Stack>
        </Card>

        {/* ------------------------------------------------------ Formulários */}
        <Card titulo="Formulários" descricao="Erro no campo certo, ligado ao input por aria-describedby.">
          <Grid minimo="240px">
            <Field label="Descrição" obrigatorio>
              {(a) => <Input placeholder="Ex.: Supermercado" {...a} />}
            </Field>
            <Field label="Valor" obrigatorio ajuda="Use ponto para centavos.">
              {(a) => <InputMoeda value={valor} onChange={(e) => setValor(e.target.value)} {...a} />}
            </Field>
            <Field label="Categoria">
              {(a) => (
                <Select {...a}>
                  <option>Alimentação</option>
                  <option>Transporte</option>
                </Select>
              )}
            </Field>
            <Field label="Valor" erro="O valor deve ser maior que zero.">
              {(a) => <InputMoeda defaultValue="0" {...a} />}
            </Field>
            <Field label="Campo desabilitado">
              {(a) => <Input disabled value="Somente leitura" readOnly {...a} />}
            </Field>
          </Grid>
        </Card>

        {/* ----------------------------------------------------------- Tabela */}
        <Card titulo="Tabela" semPadding>
          <DataTable
            dados={lancamentos}
            colunas={[
              { chave: "descricao", titulo: "Descrição" },
              { chave: "data", titulo: "Data", render: (l) => formatarData(l.data) },
              { chave: "tipo", titulo: "Tipo", render: (l) => <Badge tom={l.tipo}>{l.tipo}</Badge> },
              { chave: "valor", titulo: "Valor", alinhamento: "right", render: (l) => <Money valor={l.valor} tamanho="sm" /> },
            ]}
          />
        </Card>

        {/* ---------------------------------------------------------- Estados */}
        <Card titulo="Estados">
          <Grid minimo="280px">
            <div style={{ border: "1px dashed var(--cf-borda)", borderRadius: "var(--cf-raio-md)" }}>
              <EmptyState
                compacto
                icone={<FiInbox />}
                titulo="Você ainda não possui lançamentos"
                descricao="Adicione seu primeiro gasto para começar a acompanhar suas finanças."
                acaoRotulo="Adicionar lançamento"
                onAcao={() => toast.sucesso("Ação do estado vazio")}
              />
            </div>
            <div style={{ border: "1px dashed var(--cf-borda)", borderRadius: "var(--cf-raio-md)" }}>
              <ErrorState compacto onTentarNovamente={() => toast.aviso("Tentando de novo…")} />
            </div>
            <div style={{ border: "1px dashed var(--cf-borda)", borderRadius: "var(--cf-raio-md)", padding: "var(--cf-esp-5)" }}>
              <Rotulo>Carregando</Rotulo>
              <Stack gap="var(--cf-esp-3)">
                <Skeleton altura="28px" largura="55%" />
                <Skeleton />
                <Skeleton largura="70%" />
                <Linha><Spinner /> <span style={{ color: "var(--cf-texto-suave)" }}>Buscando dados…</span></Linha>
              </Stack>
            </div>
          </Grid>
        </Card>

        {/* ------------------------------------------------- Modal e feedback */}
        <Card titulo="Modal e feedback">
          <Linha>
            <Button onClick={() => setModalAberto(true)}>Abrir modal</Button>
            <Button variante="secundario" onClick={() => toast.sucesso("Lançamento salvo.")}>Toast de sucesso</Button>
            <Button variante="secundario" onClick={() => toast.erro("Não foi possível salvar. Tente novamente.")}>Toast de erro</Button>
            <Button variante="secundario" onClick={() => toast.aviso("Você está perto do limite de Desejos.")}>Toast de aviso</Button>
          </Linha>
        </Card>
      </Stack>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Editar lançamento"
        confirmando={carregando}
        onConfirmar={() => {
          setCarregando(true);
          setTimeout(() => {
            setCarregando(false);
            setModalAberto(false);
            toast.sucesso("Lançamento atualizado.");
          }, 900);
        }}
      >
        <Stack>
          <Field label="Descrição" obrigatorio>
            {(a) => <Input defaultValue="Supermercado" {...a} />}
          </Field>
          <Field label="Valor" obrigatorio>
            {(a) => <InputMoeda defaultValue="820.50" {...a} />}
          </Field>
        </Stack>
      </Modal>
    </AppShell>
  );
}

function Linha({ children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cf-esp-3)", alignItems: "center" }}>
      {children}
    </div>
  );
}

function Rotulo({ children }) {
  return (
    <span style={{ fontSize: "var(--cf-texto-xs)", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--cf-texto-suave)", fontWeight: 500 }}>
      {children}
    </span>
  );
}

function Amostras({ titulo, cores }) {
  return (
    <div>
      <Rotulo>{titulo}</Rotulo>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cf-esp-3)", marginTop: "var(--cf-esp-2)" }}>
        {cores.map(([token, nome]) => (
          <div key={token} style={{ width: 104 }}>
            <div style={{ height: 44, background: `var(${token})`, borderRadius: "var(--cf-raio-md)", border: "1px solid var(--cf-borda)" }} />
            <div style={{ marginTop: 4, fontSize: "var(--cf-texto-xs)", fontWeight: 500 }}>{nome}</div>
            <code style={{ fontSize: 10, color: "var(--cf-texto-fraco)" }}>{token}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
