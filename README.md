# Controle Financeiro

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-10.4-003545?logo=mariadb&logoColor=white)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

Aplicação web de finanças pessoais construída em torno de uma ideia: **todo
gasto pertence a uma das três faixas da regra 50/30/20** — necessidades, desejos
e poupança. A classificação não é um rótulo decorativo; é o que alimenta o
diagnóstico do mês, o quanto ainda dá para gastar por dia e o alerta de que uma
faixa estourou.

Backend em Laravel 12 com API REST autenticada por token, frontend em React 19.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Execução](#execução)
- [Demonstração](#demonstração)
- [Testes](#testes)
- [Build](#build)
- [Publicação na internet](#publicação-na-internet)
- [Antes de publicar](#antes-de-publicar)
- [Status do projeto](#status-do-projeto)
- [Decisões técnicas registradas](#decisões-técnicas-registradas)
- [Licença](#licença)
- [Autor](#autor)

---

## Funcionalidades

| Área | O que faz |
|---|---|
| **Dashboard** | Resumo do mês, regra 50/30/20 com o consumo de cada faixa, "quanto posso gastar por dia", ritmo de gastos, pontuação de saúde financeira e uma análise automática do período. |
| **Lançamentos** | Extrato agrupado por dia, filtros por período, faixa, categoria e busca textual, paginação com total do recorte inteiro, criação, edição, duplicação e exclusão. |
| **Renda** | Registro por competência, com uma renda ativa por mês. |
| **Categorias** | Hierarquia de dois níveis (categoria › subcategoria), catálogo global de 26 categorias e 84 subcategorias, mais as que o usuário criar. O tipo financeiro da subcategoria é herdado da mãe, sempre. |
| **Orçamentos** | Limite mensal por categoria, recorrente ou válido só para um mês. Gastos lançados em subcategorias consomem o limite da categoria mãe. |
| **Metas** | Objetivo, valor acumulado, prazo opcional e aporte rápido. Metas com prazo entram no cálculo de quanto sobra para gastar. |
| **Relatórios** | Evolução mensal, ranking de categorias, composição por faixa, exportação em CSV e PDF. |
| **Conta** | Cadastro, login, edição de perfil e troca de senha — trocar e-mail ou senha exige a senha atual. |

Cada usuário só enxerga os próprios dados. O isolamento é aplicado em duas
camadas independentes: um escopo global nos models e Policies em cada rota.

## Stack

**Backend** — PHP 8.2 · Laravel 12 · Laravel Sanctum 4 (tokens) · MariaDB 10.4 ·
Pest/PHPUnit

**Frontend** — React 19 · Vite 7 · React Router 7 · Axios · Recharts ·
Vitest + Testing Library · jsPDF e html2canvas (carregados sob demanda)

Sem framework de UI: o design system é próprio, construído sobre design tokens
em CSS.

## Arquitetura

```
Controle-Financeiro/
├── backend/controle-financeiro/     API Laravel
│   ├── app/
│   │   ├── Http/                    Controllers finos, FormRequests, Resources
│   │   ├── Models/                  Eloquent + escopos de isolamento
│   │   ├── Policies/                Autorização por recurso
│   │   └── Services/Financeiro/     Toda a regra de negócio financeira
│   ├── database/migrations/         Schema versionado
│   ├── database/seeders/            Catálogo global + dados de demonstração
│   └── tests/Feature/               Testes de API e de regra
└── frontend/controle-gastos/        SPA React
    └── src/
        ├── components/              Design system e layout
        ├── features/                Uma pasta por área do produto
        ├── Context/                 Estado compartilhado
        └── services/                Cliente HTTP e sessão
```

Três decisões estruturais que explicam o resto do código:

- **Os cálculos financeiros vivem no backend**, em `app/Services/Financeiro`.
  O frontend desenha o que a API já calculou; nenhuma soma de dinheiro é
  refeita no navegador.
- **A agregação é sempre pela categoria raiz.** Um gasto em `Moradia › Aluguel`
  entra em Moradia no Dashboard, no relatório e no orçamento —
  `COALESCE(categoria_pai_id, id)`. Sem isso, um donut mostraria três fatias
  para o mesmo bolso.
- **As telas autenticadas são carregadas sob demanda** (`React.lazy`), o que
  mantém o pacote inicial em torno de 330 kB.

## Requisitos

- PHP **8.2+** com as extensões `pdo_mysql`, `mbstring`, `openssl` e `fileinfo`
- Composer 2
- Node.js **20+** e npm
- MariaDB 10.4+ ou MySQL 8+

O ambiente de desenvolvimento de referência é o XAMPP no Windows, mas nada no
projeto depende disso.

## Instalação

```bash
git clone https://github.com/Mateuss1011/Controle-Financeiro.git
cd Controle-Financeiro
```

### Banco de dados

Crie o banco e um usuário com permissão sobre ele:

```sql
CREATE DATABASE controle_gastos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'controle'@'127.0.0.1' IDENTIFIED BY 'sua-senha';
GRANT ALL PRIVILEGES ON controle_gastos.* TO 'controle'@'127.0.0.1';
```

### Backend

```bash
cd backend/controle-financeiro
composer install
cp .env.example .env
php artisan key:generate
```

Preencha `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD` no `.env` e rode as
migrations com o catálogo global de categorias:

```bash
php artisan migrate --seed
```

### Frontend

```bash
cd frontend/controle-gastos
npm install
cp .env.example .env
```

O padrão de `VITE_API_URL` é `http://localhost:8000/api`. Ajuste se a API
estiver em outro endereço.

## Execução

Em dois terminais:

```bash
cd backend/controle-financeiro && php artisan serve
```

```bash
cd frontend/controle-gastos && npm run dev
```

A aplicação fica em **http://localhost:5173** e a API em
**http://localhost:8000**.

## Demonstração

Existe um seeder que popula a base com uma conta fictícia e quatro meses de
histórico — renda, cerca de 140 lançamentos espalhados pela hierarquia de
categorias, orçamentos nos três estados (dentro do limite, em atenção e
estourado) e metas em andamento, quase concluída e concluída.

```bash
cd backend/controle-financeiro
php artisan db:seed --class=DemoDataSeeder
```

Credenciais da conta de demonstração:

| | |
|---|---|
| E-mail | `demo@controlefinanceiro.local` |
| Senha | `Demo@123456` |

> ⚠️ **Todos os dados da demonstração são fictícios.** Nome, e-mail, salários,
> gastos, orçamentos e metas foram inventados para exibir o produto. Nenhum
> dado real de pessoa alguma está neste repositório.

### O que a conta de demonstração garante — e o que não garante

**Garante isolamento.** Quem entra com a conta demo não alcança dado de mais
ninguém, nem manipulando ids na URL. O isolamento é aplicado em duas camadas
independentes — escopo global nos models e Policy em cada rota — e está coberto
por 17 testes que atacam vetores diferentes: listar, ver por id, editar por id,
excluir por id e criar apontando para a categoria de outro. Criar sua própria
conta no site público lhe dá um espaço inteiramente separado.

**Não garante privacidade dentro da própria conta demo.** Ela é uma conta só,
com a senha publicada: todos os visitantes entram no mesmo espaço e enxergam as
alterações uns dos outros. É o ponto da demonstração — e o motivo de os dados
serem fictícios. Se alguém bagunçar, rodar o seeder de novo restaura tudo.

**A conta demo não muda de dono.** Com `DEMO_EMAIL` configurado, ela perde o
direito de trocar o próprio e-mail e a própria senha. Sem essa trava, o
primeiro visitante que quisesse usaria a senha publicada para tomar a conta e
deixar a demonstração inacessível para todos. `ContaDeDemonstracaoTest` prova
as duas metades: a conta demo é recusada, e qualquer outro usuário continua
editando o próprio perfil normalmente.

O seeder é **idempotente**: rodar de novo apaga apenas o que pertence à conta de
demonstração e recria tudo, sem duplicar. Ele nunca toca em outros usuários nem
nas categorias globais. E **não roda em produção** — lá ele só executa com
`DEMO_SEED_ALLOWED=true` explicitamente definido no ambiente.

## Testes

```bash
# Backend — 352 testes, 1.328 assertions
cd backend/controle-financeiro && php artisan test

# Frontend — 268 testes
cd frontend/controle-gastos && npm test

# Lint do frontend
npm run lint
```

Os testes de backend rodam em SQLite em memória; os de frontend, em jsdom.
Nenhum dos dois toca o banco de desenvolvimento.

## Build

```bash
cd frontend/controle-gastos
npm run build
```

A saída vai para `dist/`. Sirva esses arquivos estáticos e aponte
`VITE_API_URL` para a URL pública da API.

## Publicação na internet

O projeto é desenhado para rodar dividido em três serviços, todos com plano
gratuito permanente:

| Peça | Serviço | O que roda lá |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Os estáticos do `npm run build` |
| API | [Render](https://render.com) — web service Docker | A imagem do [`Dockerfile`](backend/controle-financeiro/Dockerfile) |
| Banco | [Aiven for MySQL](https://aiven.io/free-mysql-database) | MySQL 8 gerenciado |

A divisão só é possível porque a API é **stateless**: a autenticação é por
token Bearer, não por cookie de sessão (`supports_credentials` é `false` em
`config/cors.php`). Front e back podem viver em domínios diferentes sem
nenhuma negociação de SameSite.

### Frontend na Vercel

Root Directory: `frontend/controle-gastos`. O framework é detectado como Vite e
o build é `npm run build`.

O [`vercel.json`](frontend/controle-gastos/vercel.json) existe por um motivo só:
o app usa `BrowserRouter`, com caminhos reais como `/metas`. Sem o rewrite para
`index.html`, um F5 nessa URL procuraria um arquivo `metas` que não existe e
devolveria 404. A Vercel resolve os arquivos estáticos antes de aplicar
rewrites, então `/assets/*` continua sendo servido normalmente.

Variável de ambiente:

```
VITE_API_URL = https://<sua-api>.onrender.com/api
```

### API no Render

O serviço inteiro está descrito em [`render.yaml`](render.yaml), na raiz do
repositório: **New → Blueprint**, aponte para este repositório e o Render cria
o web service com o plano, a região, o health check e as variáveis já no lugar.
As nove variáveis marcadas `sync: false` são pedidas na criação e nunca ficam
versionadas.

Pela interface, se preferir: Web Service, Language **Docker**, Root Directory
`backend/controle-financeiro`, Health Check Path `/up`, plano **Free**.

Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `APP_KEY` | saída de `php artisan key:generate --show` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://<sua-api>.onrender.com` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | do painel do Aiven |
| `MYSQL_ATTR_SSL_CA` | caminho do certificado do Aiven (a conexão exige TLS) |
| `CORS_ALLOWED_ORIGINS` | `https://<seu-app>.vercel.app` |
| `LOG_CHANNEL` | `stderr` — no plano gratuito não há disco persistente |
| `PORT` | `8080` — é a porta em que a imagem escuta |

### Migrations e catálogo

O plano gratuito do Render não dá shell nem one-off jobs, e o `Dockerfile` de
propósito **não** roda migrations ao subir: um container que migra sozinho
aplica schema em horário imprevisível e sem ninguém olhando o resultado.

Rode da sua máquina, apontando para o banco remoto. Copie
[`.env.aiven.example`](backend/controle-financeiro/.env.aiven.example) para
`.env.aiven`, preencha com os dados do painel do Aiven — o arquivo é ignorado
pelo Git — e use `--env=aiven`:

```bash
cd backend/controle-financeiro
cp .env.aiven.example .env.aiven   # e preencha
php artisan migrate --force --env=aiven
php artisan db:seed --class=CategoriaSeeder --env=aiven
```

O `--env=aiven` existe para que o `.env` local nunca precise ser trocado de
lugar e devolvido depois. Funcionaria — até a vez em que alguém esquecesse de
devolver e rodasse uma migration no banco errado.

Para a conta de demonstração pública, veja a seção [Demonstração](#demonstração).
Em produção o `DemoDataSeeder` só executa com `DEMO_SEED_ALLOWED=true`.

### Cartão de crédito

Nenhum dos três exige cartão, e em nenhum deles estourar a franquia vira conta
a pagar:

- **Aiven** — a documentação é explícita: não é preciso cartão e o serviço pode
  ser usado por tempo indeterminado sem custo.
- **Vercel Hobby** — plano gratuito sem ciclo de cobrança. Ao exceder um
  limite, o recurso pausa por 30 dias em vez de gerar fatura.
- **Render** — o cartão não é exigido para criar um serviço Free. Ele decide
  apenas o que acontece quando a franquia de banda ou de build acaba: **sem
  cartão, os serviços são suspensos até o mês seguinte**, nunca cobrados.

Uma restrição que vale ler antes de começar: o **plano Hobby da Vercel é
limitado a uso pessoal e não comercial**. Um projeto de portfólio, aberto para
outras pessoas conhecerem, está dentro. Cobrar pelo acesso, não.

### O que esperar do plano gratuito

- **A API dorme.** Sem tráfego por 15 minutos, o Render desliga a instância; a
  requisição seguinte espera cerca de um minuto enquanto ela sobe. O primeiro
  acesso do dia é lento — não é defeito do app.
- **São 750 horas de instância por mês**, por workspace. Um serviço rodando
  ininterruptamente consome ~720.
- **O banco gratuito do Aiven tem 1 GB** e no máximo 76 conexões simultâneas.
  Backups estão incluídos. O Aiven pode desligar um serviço ocioso, avisando
  antes; religar é um clique.
- Nada disso é contrato. Fly.io, Railway e Heroku já encerraram seus planos
  gratuitos. Mantenha o backup do banco fora do repositório.

## Antes de publicar

A API é segura por padrão **desde que três variáveis estejam certas**. Todas
estão comentadas em `backend/controle-financeiro/.env.example`:

| Variável | Produção | Por quê |
|---|---|---|
| `APP_DEBUG` | `false` | Com `true`, um erro 500 devolve a mensagem original da exceção, o caminho absoluto do arquivo no servidor e o stack trace inteiro dentro do JSON. Com `false`, a mesma falha vira `{"message": "Server Error"}`. |
| `APP_ENV` | `production` | Desliga rotas e comportamentos de desenvolvimento. |
| `CORS_ALLOWED_ORIGINS` | domínio do frontend | O padrão libera apenas o servidor de desenvolvimento do Vite. **Sem ajustar, o frontend em produção é bloqueado pelo navegador** e a aplicação não funciona. |

Também gere a chave antes do primeiro deploy: `php artisan key:generate`.

Complementos úteis, não bloqueantes: `LOG_LEVEL=warning` (o nível `debug` grava
dados de requisição) e, em mais de uma instância, `CACHE_STORE=redis` — o
limitador de tentativas de senha guarda o contador no cache, e com `database`
ou `file` cada instância conta separado.

## Status do projeto

Funcional e completo para uso pessoal. Todas as áreas listadas acima estão
implementadas, cobertas por testes automatizados e validadas contra MariaDB
real. O projeto foi desenvolvido em etapas, cada uma fechada com testes,
verificação de responsividade (375 / 768 / 1024 / 1440 px) e auditoria de
segurança e performance.

Não implementado, e deliberadamente fora do escopo por enquanto: recuperação de
senha por e-mail, importação de extrato bancário, múltiplas moedas, categorias
compartilhadas entre usuários e qualquer recurso de IA.

---

## Decisões técnicas registradas

### Unicidade de nomes de categoria — insensível a caixa e a acento

Duas categorias visíveis para o mesmo usuário não podem ter nomes equivalentes.
"Outros" e "outros" são o mesmo nome; "Café" e "Cafe", também.

Essa regra **já valia em produção**, mas por acidente: a coluna
`categorias.nome` é `utf8mb4_unicode_ci` no MariaDB, e essa collation ignora
caixa e acento. A comparação era delegada ao banco através de `Rule::unique`.

O problema não era a regra — era o lugar dela. A suíte roda em SQLite, onde `=`
é sensível à caixa e `COLLATE NOCASE` só dobra `A–Z` ASCII: `"ALIMENTAÇÃO"` e
`"Alimentação"` continuavam nomes distintos. Os testes mediam um comportamento
que a produção não tinha.

A regra passou a viver na aplicação, em `Categoria::normalizarNome()` — ponto
único, usado por `StoreCategoriaRequest` e herdado por `UpdateCategoriaRequest`.
A normalização é `mb_strtolower` seguido de uma tabela de transliteração de
diacríticos, em PHP puro, e por isso dá o mesmo resultado nos dois bancos.

**Limitação, declarada de propósito:** a tabela cobre o alfabeto latino, que é o
necessário para um produto em português. **Não é uma implementação geral de
Unicode** — um nome em grego ou cirílico com diacrítico ainda seria comparado de
forma diferente do que o MariaDB faria. `ext-intl` não está instalada no
ambiente, e `iconv('ASCII//TRANSLIT')` varia de resultado conforme o sistema,
que é exatamente a variação que essa centralização existe para eliminar.

A equivalência foi conferida caractere a caractere contra o próprio MariaDB: 53
acentuados, nenhuma divergência.

### Mensagens de erro da API

Toda resposta de erro da API é JSON, em português, e não descreve o servidor.

O padrão do Laravel para um id inexistente é
`No query results for model [App\Models\Gasto] 999` — **e isso sai assim mesmo
com `APP_DEBUG=false`**. Duas coisas erradas de uma vez: o namespace da classe
interna vira informação pública, e o usuário recebe uma frase técnica em inglês.
Um 404 é rotina (basta um link antigo), então não é um caso de canto. Rota
inexistente e método errado devolviam `message` vazia; a negativa de Policy vinha
como "This action is unauthorized.".

Os quatro casos são tratados em `bootstrap/app.php`, sem mudar nenhum status
code. `tests/Feature/Api/RespostasDeErroTest.php` trava o comportamento — e roda
com `app.debug` **ligado** de propósito: se a resposta é limpa na configuração
mais perigosa, é limpa sempre.

### Paginação de `/api/categorias` e `/api/metas` — avaliada e recusada

Nenhuma das duas rotas é paginada, e isso é deliberado.

**Categorias.** O conjunto é pequeno por natureza e limitado por construção: o
catálogo global tem 26 categorias principais com 84 subcategorias, mais as que o
próprio usuário cria à mão, e a árvore para em dois níveis. A resposta mede
cerca de 130 bytes por item. Mais decisivo que o tamanho é o uso: a lista é
carregada num ponto só (`GastosProvider`) e alimenta três consumidores que
precisam do **conjunto completo** — o `select` do formulário de lançamento, o
agrupamento nas três faixas da tela de Categorias e o `select` do formulário de
orçamento. Paginar quebraria o `select`: com 30 categorias, o usuário veria
apenas as primeiras no dropdown. Para não quebrar, o frontend teria de buscar
todas as páginas em sequência — mais lento e mais complexo que não paginar.

**Metas.** Mesma cardinalidade baixa e controlada pelo usuário. Além disso, o
`resumo` (compromisso mensal, totais, quantas estão concluídas) é calculado
sobre **todas** as metas; uma lista paginada ao lado de um resumo global seria
incoerente de ler.

Ambas as rotas já estão sob `throttle:api` (120 requisições por minuto). A
paginação seria complexidade nas duas pontas para um problema que não existe no
volume real nem no previsível. Se um dia o volume mudar, o caminho é paginar
**junto com** uma busca no `select` — as duas coisas juntas, não a paginação
sozinha.

---

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Autor

**Mateus Silva Santos**

- GitHub: [@Mateuss1011](https://github.com/Mateuss1011)
- LinkedIn: [Mateus Silva Santos](https://www.linkedin.com/in/mateus-silva-santos-678082283)
