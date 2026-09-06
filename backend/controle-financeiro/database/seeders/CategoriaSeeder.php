<?php

namespace Database\Seeders;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use Illuminate\Database\Seeder;

/**
 * Catálogo global de categorias e subcategorias (user_id NULL).
 *
 * Duas regras de forma orientaram a lista:
 *
 *  - POUCAS categorias principais. Elas são o que aparece no primeiro select do
 *    lançamento e no eixo dos relatórios; uma lista de sessenta itens ali não
 *    se navega, se vasculha.
 *  - A granularidade mora nas subcategorias, onde não custa nada: o segundo
 *    select só mostra as filhas da categoria escolhida.
 *
 * O nome da categoria é limpo. O catálogo antigo carregava a taxonomia dentro
 * do próprio nome — "Moradia (Aluguel, Contas)" era uma categoria fingindo ser
 * três, porque não havia onde colocar a subdivisão.
 *
 * IDEMPOTENTE: `updateOrCreate` por (nome, pai, user_id NULL). Rodar de novo
 * não duplica nem apaga o que o usuário criou.
 */
class CategoriaSeeder extends Seeder
{
    /**
     * @return array<string, array<int, array{0: string, 1: array<int, string>}>>
     */
    public static function catalogo(): array
    {
        return [
            TipoCategoria::Necessidade->value => [
                ['Moradia', [
                    'Aluguel', 'Financiamento', 'Condomínio', 'Energia elétrica',
                    'Água', 'Gás', 'Internet residencial', 'Manutenção da casa',
                    'Móveis e utensílios',
                ]],
                ['Alimentação', [
                    'Supermercado', 'Feira', 'Padaria', 'Açougue', 'Refeição no trabalho',
                ]],
                ['Transporte', [
                    'Combustível', 'Uber/99', 'Transporte público', 'Estacionamento',
                    'Pedágio', 'Manutenção', 'Seguro do veículo', 'Documentação e IPVA',
                ]],
                ['Saúde', [
                    'Plano de saúde', 'Consulta', 'Exames', 'Medicamentos',
                    'Dentista', 'Academia',
                ]],
                ['Educação', [
                    'Faculdade', 'Escola', 'Cursos', 'Livros', 'Material', 'Certificações',
                ]],
                ['Contas e serviços', [
                    'Telefone celular', 'Serviços bancários', 'Correios', 'Assinaturas essenciais',
                ]],
                ['Família', [
                    'Filhos', 'Pais', 'Pensão', 'Cuidados familiares',
                ]],
                ['Impostos e taxas', [
                    'Impostos', 'Taxas', 'Documentação',
                ]],
                ['Outros essenciais', []],
            ],

            TipoCategoria::Desejo->value => [
                ['Restaurantes', ['Restaurante', 'Bar', 'Café']],
                ['Delivery', ['iFood', 'Outros deliveries']],
                ['Entretenimento', ['Cinema', 'Shows', 'Eventos']],
                ['Streaming e assinaturas', ['Vídeo', 'Música', 'Software não essencial']],
                ['Jogos', ['Jogos', 'Assinaturas de jogos', 'Itens digitais']],
                ['Compras', ['Roupas', 'Calçados', 'Eletrônicos', 'Acessórios', 'Compras diversas']],
                ['Viagens', ['Passagens', 'Hospedagem', 'Passeios', 'Alimentação em viagem']],
                ['Hobbies', ['Esportes', 'Instrumentos', 'Colecionáveis', 'Outros hobbies']],
                ['Beleza e cuidados pessoais', ['Cabelo', 'Barbeiro', 'Cosméticos', 'Estética']],
                ['Presentes', []],
                ['Outros desejos', []],
            ],

            TipoCategoria::Poupanca->value => [
                ['Reserva de emergência', []],
                ['Investimentos', [
                    'Renda fixa', 'Ações', 'Fundos', 'FIIs', 'Criptoativos', 'Outros investimentos',
                ]],
                ['Aposentadoria', ['Previdência', 'Investimentos de longo prazo']],
                ['Poupança', []],
                ['Metas financeiras', []],
                ['Amortização de dívidas', []],
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::catalogo() as $tipo => $principais) {
            foreach ($principais as [$nome, $subcategorias]) {
                $mae = Categoria::withoutGlobalScopes()->updateOrCreate(
                    ['nome' => $nome, 'user_id' => null, 'categoria_pai_id' => null],
                    ['tipo' => $tipo],
                );

                foreach ($subcategorias as $filha) {
                    Categoria::withoutGlobalScopes()->updateOrCreate(
                        ['nome' => $filha, 'user_id' => null, 'categoria_pai_id' => $mae->id],
                        // `tipo` vai junto por completude; o model o deriva da
                        // mãe de qualquer forma, no evento `saving`.
                        ['tipo' => $tipo],
                    );
                }
            }
        }
    }
}
