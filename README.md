# Controle Financeiro

Aplicação de finanças pessoais: lançamentos, renda por competência, orçamentos,
metas e relatórios, com a regra 50/30/20 como espinha dorsal da análise.

> **Documento em construção.** Este README registra, por enquanto, apenas as
> decisões técnicas fechadas durante a fase final de endurecimento. A visão
> geral, a arquitetura, as instruções de execução e o histórico de decisões
> A1–A8 entram na etapa de fechamento.

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

### Paginação de `/api/categorias` e `/api/metas` — avaliada e recusada

Nenhuma das duas rotas é paginada, e isso é deliberado.

**Categorias.** O conjunto é pequeno por natureza: 7 globais do sistema mais as
que o próprio usuário cria à mão. A resposta mede 124 bytes por item — 6 kB com
50 categorias, 24 kB com 200. Mais decisivo que o tamanho é o uso: a lista é
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
