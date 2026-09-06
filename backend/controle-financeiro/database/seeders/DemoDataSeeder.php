<?php

namespace Database\Seeders;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Meta;
use App\Models\Orcamento;
use App\Models\Salario;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Conta de demonstração — dados inteiramente fictícios.
 *
 * Existe para que quem clona o repositório veja o produto com um histórico
 * plausível em vez de telas vazias: quatro competências de renda, gastos
 * espalhados pela hierarquia de categorias, orçamentos nos três estados e
 * metas em andamento, quase concluída e concluída.
 *
 * TRÊS GARANTIAS, e elas são o motivo deste arquivo existir em vez de um
 * `factory()->count(100)`:
 *
 *  1. IDEMPOTENTE. Rodar de novo apaga só o que pertence ao usuário demo e
 *     recria tudo. Não duplica, não acumula.
 *  2. ESCOPO FECHADO. Toda remoção é filtrada por `user_id` do demo. Nenhuma
 *     consulta aqui é capaz de alcançar outro usuário, e nenhuma toca as
 *     categorias globais (que têm `user_id` nulo).
 *  3. DETERMINÍSTICO. Nenhum `rand()`. Os mesmos valores saem em qualquer
 *     máquina — o que muda é só a âncora das datas, presa ao mês corrente
 *     para que a demonstração nunca pareça abandonada.
 *
 * Não roda em produção sem consentimento explícito: veja `podeExecutar()`.
 */
class DemoDataSeeder extends Seeder
{
    public const EMAIL = 'demo@controlefinanceiro.local';

    public const NOME = 'Lucas Almeida';

    /** Publicada de propósito: é uma conta de demonstração, não um segredo. */
    public const SENHA = 'Demo@123456';

    /** Mês corrente mais os três anteriores. */
    private const COMPETENCIAS = 4;

    /**
     * Renda de cada competência, do mês corrente para trás.
     *
     * @var array<int, array{valor: float, descricao: string}>
     */
    private const RENDAS = [
        0 => ['valor' => 9400.00, 'descricao' => 'Salário'],
        1 => ['valor' => 9400.00, 'descricao' => 'Salário'],
        2 => ['valor' => 9000.00, 'descricao' => 'Salário'],
        3 => ['valor' => 9000.00, 'descricao' => 'Salário'],
    ];

    /**
     * Movimentações do mês, com o valor de cada competência.
     *
     * `valores` é indexado por quantos meses atrás: 0 é o mês corrente, 3 o
     * mais antigo. `null` significa que aquele gasto não existiu naquele mês —
     * é o que dá textura ao histórico e evita quatro meses idênticos.
     *
     * `categoria` é o caminho: [mãe] ou [mãe, subcategoria].
     *
     * @var array<int, array{dia: int, descricao: string, categoria: array<int, string>, valores: array<int, float|null>}>
     */
    private const MOVIMENTOS = [
        // ------------------------------------------------------ Necessidades
        ['dia' => 5,  'descricao' => 'Aluguel do apartamento', 'categoria' => ['Moradia', 'Aluguel'],              'valores' => [1620.00, 1620.00, 1620.00, 1560.00]],
        ['dia' => 5,  'descricao' => 'Condomínio',             'categoria' => ['Moradia', 'Condomínio'],           'valores' => [330.00, 330.00, 324.00, 324.00]],
        ['dia' => 12, 'descricao' => 'Conta de luz',           'categoria' => ['Moradia', 'Energia elétrica'],     'valores' => [null, 214.90, 236.10, 182.40]],
        ['dia' => 15, 'descricao' => 'Conta de água',          'categoria' => ['Moradia', 'Água'],                 'valores' => [null, 68.90, 81.20, 74.30]],
        ['dia' => 10, 'descricao' => 'Internet fibra',         'categoria' => ['Moradia', 'Internet residencial'], 'valores' => [null, 119.90, 119.90, 119.90]],
        ['dia' => 18, 'descricao' => 'Botijão de gás',         'categoria' => ['Moradia', 'Gás'],                  'valores' => [null, null, 135.00, null]],
        ['dia' => 22, 'descricao' => 'Conserto do chuveiro',   'categoria' => ['Moradia', 'Manutenção da casa'],   'valores' => [null, 180.00, null, null]],

        ['dia' => 3,  'descricao' => 'Supermercado do mês',    'categoria' => ['Alimentação', 'Supermercado'],     'valores' => [412.80, 438.20, 401.60, 425.90]],
        ['dia' => 14, 'descricao' => 'Supermercado',           'categoria' => ['Alimentação', 'Supermercado'],     'valores' => [null, 268.90, 312.40, 289.70]],
        ['dia' => 24, 'descricao' => 'Compras da semana',      'categoria' => ['Alimentação', 'Supermercado'],     'valores' => [null, null, null, null]],
        ['dia' => 6,  'descricao' => 'Feira livre',            'categoria' => ['Alimentação', 'Feira'],            'valores' => [96.40, 88.20, 94.70, 91.30]],
        ['dia' => 6,  'descricao' => 'Padaria da esquina',     'categoria' => ['Alimentação', 'Padaria'],          'valores' => [32.50, 28.40, 31.20, 29.80]],
        ['dia' => 21, 'descricao' => 'Padaria',                'categoria' => ['Alimentação', 'Padaria'],          'valores' => [null, 24.90, 26.70, null]],
        ['dia' => 17, 'descricao' => 'Marmita do trabalho',    'categoria' => ['Alimentação', 'Refeição no trabalho'], 'valores' => [null, 198.00, 198.00, 180.00]],

        ['dia' => 4,  'descricao' => 'Posto de combustível',   'categoria' => ['Transporte', 'Combustível'],       'valores' => [220.00, 232.40, 218.90, 205.60]],
        ['dia' => 19, 'descricao' => 'Abastecimento',          'categoria' => ['Transporte', 'Combustível'],       'valores' => [null, null, 224.10, null]],
        ['dia' => 9,  'descricao' => 'Corrida de aplicativo',  'categoria' => ['Transporte', 'Uber/99'],           'valores' => [null, 34.50, 28.90, 41.20]],
        ['dia' => 26, 'descricao' => 'Corrida de aplicativo',  'categoria' => ['Transporte', 'Uber/99'],           'valores' => [null, 22.70, null, 19.80]],
        ['dia' => 11, 'descricao' => 'Estacionamento mensal',  'categoria' => ['Transporte', 'Estacionamento'],    'valores' => [null, null, null, null]],
        ['dia' => 27, 'descricao' => 'Revisão do carro',       'categoria' => ['Transporte', 'Manutenção'],        'valores' => [null, null, 420.00, null]],

        ['dia' => 5,  'descricao' => 'Mensalidade da academia', 'categoria' => ['Saúde', 'Academia'],              'valores' => [129.90, 129.90, 129.90, 119.90]],
        ['dia' => 10, 'descricao' => 'Plano de saúde',         'categoria' => ['Saúde', 'Plano de saúde'],         'valores' => [null, 349.00, 349.00, 339.00]],
        ['dia' => 18, 'descricao' => 'Farmácia',               'categoria' => ['Saúde', 'Medicamentos'],           'valores' => [null, 87.60, 62.30, 104.50]],
        ['dia' => 23, 'descricao' => 'Consulta com dentista',  'categoria' => ['Saúde', 'Dentista'],               'valores' => [null, null, 280.00, null]],

        ['dia' => 8,  'descricao' => 'Plano do celular',       'categoria' => ['Contas e serviços', 'Telefone celular'], 'valores' => [null, 59.90, 59.90, 59.90]],
        ['dia' => 20, 'descricao' => 'Tarifa bancária',        'categoria' => ['Contas e serviços', 'Serviços bancários'], 'valores' => [null, 34.00, 34.00, 34.00]],

        ['dia' => 12, 'descricao' => 'Curso de inglês',        'categoria' => ['Educação', 'Cursos'],              'valores' => [null, 199.00, 199.00, 199.00]],
        ['dia' => 25, 'descricao' => 'Livro técnico',          'categoria' => ['Educação', 'Livros'],              'valores' => [null, 118.90, null, 92.40]],

        ['dia' => 16, 'descricao' => 'Presente para a família', 'categoria' => ['Família', 'Pais'],                'valores' => [null, null, 220.00, null]],
        ['dia' => 28, 'descricao' => 'IPVA parcelado',         'categoria' => ['Impostos e taxas', 'Impostos'],    'valores' => [null, 312.00, 312.00, 312.00]],

        // Categoria e subcategorias criadas pelo próprio usuário demo.
        ['dia' => 7,  'descricao' => 'Ração 15 kg',            'categoria' => ['Pets', 'Ração'],                   'valores' => [null, 189.90, null, 189.90]],
        ['dia' => 13, 'descricao' => 'Consulta veterinária',   'categoria' => ['Pets', 'Veterinário'],             'valores' => [null, null, 180.00, null]],

        // ------------------------------------------------------------ Desejos
        ['dia' => 2,  'descricao' => 'Netflix',                'categoria' => ['Streaming e assinaturas', 'Vídeo'], 'valores' => [44.90, 44.90, 44.90, 39.90]],
        ['dia' => 2,  'descricao' => 'Spotify',                'categoria' => ['Streaming e assinaturas', 'Música'], 'valores' => [21.90, 21.90, 21.90, 21.90]],
        ['dia' => 4,  'descricao' => 'iFood',                  'categoria' => ['Delivery', 'iFood'],               'valores' => [68.90, 72.10, 54.30, 81.40]],
        ['dia' => 17, 'descricao' => 'iFood',                  'categoria' => ['Delivery', 'iFood'],               'valores' => [null, 58.70, 66.20, 49.90]],
        ['dia' => 29, 'descricao' => 'Delivery de pizza',      'categoria' => ['Delivery', 'Outros deliveries'],   'valores' => [null, 74.00, null, 68.00]],
        ['dia' => 13, 'descricao' => 'Almoço de fim de semana', 'categoria' => ['Restaurantes', 'Restaurante'],    'valores' => [null, 128.40, 142.60, 95.00]],
        ['dia' => 6,  'descricao' => 'Café da manhã fora',     'categoria' => ['Restaurantes', 'Café'],            'valores' => [38.50, 32.00, 35.80, 29.90]],
        ['dia' => 19, 'descricao' => 'Cafeteria',              'categoria' => ['Restaurantes', 'Café'],            'valores' => [null, 24.00, 31.50, 27.00]],
        ['dia' => 27, 'descricao' => 'Happy hour',             'categoria' => ['Restaurantes', 'Bar'],             'valores' => [null, 96.00, null, 112.00]],
        ['dia' => 22, 'descricao' => 'Cinema',                 'categoria' => ['Entretenimento', 'Cinema'],        'valores' => [null, 62.00, null, 58.00]],
        ['dia' => 15, 'descricao' => 'Show de rock',           'categoria' => ['Entretenimento', 'Shows'],         'valores' => [null, null, 320.00, null]],
        ['dia' => 21, 'descricao' => 'Jogo na Steam',          'categoria' => ['Jogos', 'Jogos'],                  'valores' => [null, 89.90, null, null]],
        ['dia' => 11, 'descricao' => 'Tênis de corrida',       'categoria' => ['Compras', 'Calçados'],             'valores' => [null, 399.90, null, null]],
        ['dia' => 24, 'descricao' => 'Camisetas',              'categoria' => ['Compras', 'Roupas'],               'valores' => [null, 219.80, null, null]],
        ['dia' => 8,  'descricao' => 'Fones de ouvido',        'categoria' => ['Compras', 'Eletrônicos'],          'valores' => [null, null, null, 289.00]],
        ['dia' => 20, 'descricao' => 'Corte de cabelo',        'categoria' => ['Beleza e cuidados pessoais', 'Barbeiro'], 'valores' => [null, 60.00, 60.00, 55.00]],
        ['dia' => 14, 'descricao' => 'Passagem aérea',         'categoria' => ['Viagens', 'Passagens'],            'valores' => [null, null, null, 690.00]],
        ['dia' => 16, 'descricao' => 'Hospedagem',             'categoria' => ['Viagens', 'Hospedagem'],           'valores' => [null, null, null, 480.00]],
        ['dia' => 9,  'descricao' => 'Revelação de fotos',     'categoria' => ['Hobbies', 'Fotografia'],           'valores' => [null, 78.00, null, 64.00]],

        // ----------------------------------------------------------- Poupança
        ['dia' => 6,  'descricao' => 'Aporte na reserva',      'categoria' => ['Reserva de emergência'],           'valores' => [600.00, 600.00, 600.00, 500.00]],
        ['dia' => 6,  'descricao' => 'Tesouro Selic',          'categoria' => ['Investimentos', 'Renda fixa'],     'valores' => [400.00, 400.00, 400.00, 350.00]],
        ['dia' => 26, 'descricao' => 'Compra de ações',        'categoria' => ['Investimentos', 'Ações'],          'valores' => [null, 250.00, null, 250.00]],
        ['dia' => 26, 'descricao' => 'Aporte em FIIs',         'categoria' => ['Investimentos', 'FIIs'],           'valores' => [null, null, 300.00, null]],
        ['dia' => 7,  'descricao' => 'Aporte para a viagem',   'categoria' => ['Metas financeiras'],               'valores' => [null, 300.00, 300.00, 300.00]],
    ];

    /**
     * Categorias do próprio usuário demo, para que a tela de Categorias mostre
     * a diferença entre "do sistema" e "sua" — e a hierarquia funcionando dos
     * dois lados: uma mãe própria com filhas próprias, e uma filha própria
     * dentro de uma mãe global.
     *
     * @var array<int, array{nome: string, tipo: string, pai: string|null}>
     */
    private const CATEGORIAS_DO_DEMO = [
        ['nome' => 'Pets',        'tipo' => 'necessidade', 'pai' => null],
        ['nome' => 'Ração',       'tipo' => null,          'pai' => 'Pets'],
        ['nome' => 'Veterinário', 'tipo' => null,          'pai' => 'Pets'],
        ['nome' => 'Fotografia',  'tipo' => null,          'pai' => 'Hobbies'],
    ];

    /**
     * Limites recorrentes, escolhidos para que o painel mostre os três estados
     * no mês corrente: um estourado, um em atenção e os demais folgados.
     *
     * O orçamento vive SEMPRE na categoria principal — os gastos das filhas
     * consomem o limite da mãe.
     *
     * @var array<string, float>
     */
    private const ORCAMENTOS = [
        'Alimentação' => 520.00,
        'Moradia'     => 2400.00,
        'Transporte'  => 450.00,
        'Saúde'       => 750.00,
        'Delivery'    => 200.00,
        'Restaurantes' => 300.00,
    ];

    /**
     * @var array<int, array{nome: string, objetivo: float, atual: float, prazo_em_meses: int|null}>
     */
    private const METAS = [
        ['nome' => 'Reserva de emergência',   'objetivo' => 18000.00, 'atual' => 12400.00, 'prazo_em_meses' => 15],
        ['nome' => 'Viagem para o Chile',     'objetivo' => 8000.00,  'atual' => 7200.00,  'prazo_em_meses' => 5],
        ['nome' => 'Notebook novo',           'objetivo' => 6500.00,  'atual' => 6500.00,  'prazo_em_meses' => 2],
        ['nome' => 'Curso de especialização', 'objetivo' => 4800.00,  'atual' => 1150.00,  'prazo_em_meses' => 18],
        ['nome' => 'Trocar de carro',         'objetivo' => 35000.00, 'atual' => 4300.00,  'prazo_em_meses' => null],
    ];

    public function run(): void
    {
        if (! $this->podeExecutar()) {
            $this->command?->warn(
                'DemoDataSeeder ignorado: em produção ele só roda com DEMO_SEED_ALLOWED=true.'
            );

            return;
        }

        if (Categoria::withoutGlobalScopes()->whereNull('user_id')->doesntExist()) {
            $this->command?->info('Catálogo global ausente — rodando o CategoriaSeeder antes.');
            $this->call(CategoriaSeeder::class);
        }

        $demo = $this->usuarioDemo();

        $this->limparDadosDoDemo($demo);

        $categorias = $this->criarCategoriasDoDemo($demo);
        $this->criarRendas($demo);
        $lancamentos = $this->criarLancamentos($demo, $categorias);
        $this->criarOrcamentos($demo, $categorias);
        $this->criarMetas($demo);

        $this->command?->info(sprintf(
            'Demonstração pronta: %s / %s — %d lançamentos em %d competências.',
            self::EMAIL,
            self::SENHA,
            $lancamentos,
            self::COMPETENCIAS
        ));
    }

    /**
     * Em produção, só com consentimento explícito.
     *
     * `db:seed` já pede confirmação em produção, mas essa confirmação é fácil
     * de dar por engano num deploy automatizado — e aqui o engano criaria um
     * usuário com senha conhecida num banco real.
     */
    private function podeExecutar(): bool
    {
        return ! app()->isProduction() || filter_var(env('DEMO_SEED_ALLOWED', false), FILTER_VALIDATE_BOOL);
    }

    private function usuarioDemo(): User
    {
        $usuario = User::firstOrNew(['email' => self::EMAIL]);

        $usuario->name = self::NOME;
        $usuario->password = Hash::make(self::SENHA);
        $usuario->email_verified_at ??= now();
        $usuario->save();

        return $usuario;
    }

    /**
     * Remove só o que é do demo, e nada mais.
     *
     * A ordem importa: lançamentos e orçamentos apontam para as categorias
     * dele, então as categorias saem por último. Nenhuma destas consultas
     * alcança outro usuário nem as categorias globais, que têm `user_id` nulo.
     */
    private function limparDadosDoDemo(User $demo): void
    {
        Gasto::withoutGlobalScopes()->where('user_id', $demo->id)->delete();
        Orcamento::withoutGlobalScopes()->where('user_id', $demo->id)->delete();
        Meta::withoutGlobalScopes()->where('user_id', $demo->id)->delete();
        Salario::withoutGlobalScopes()->withTrashed()->where('user_id', $demo->id)->forceDelete();

        // Filhas antes das mães: a FK é `restrict` na aplicação, e apagar a mãe
        // primeiro dependeria do cascade — que esta base não usa como regra.
        Categoria::withoutGlobalScopes()->where('user_id', $demo->id)->whereNotNull('categoria_pai_id')->delete();
        Categoria::withoutGlobalScopes()->where('user_id', $demo->id)->delete();
    }

    /**
     * @return array<string, Categoria> indexado por "Mãe" e "Mãe › Filha"
     */
    private function criarCategoriasDoDemo(User $demo): array
    {
        $mapa = $this->catalogoVisivel($demo);

        foreach (self::CATEGORIAS_DO_DEMO as $definicao) {
            $pai = $definicao['pai'] === null ? null : ($mapa[$definicao['pai']] ?? null);

            if ($definicao['pai'] !== null && $pai === null) {
                throw new RuntimeException("Categoria mãe \"{$definicao['pai']}\" não existe no catálogo.");
            }

            $categoria = new Categoria([
                'nome'             => $definicao['nome'],
                'categoria_pai_id' => $pai?->id,
                // Na subcategoria o tipo é derivado do pai pelo próprio model;
                // o valor abaixo só existe para a categoria principal.
                'tipo'             => $definicao['tipo'] ?? $pai?->tipo->value ?? TipoCategoria::Necessidade->value,
            ]);
            $categoria->user_id = $demo->id;
            $categoria->save();

            $chave = $pai === null ? $categoria->nome : $pai->nome . ' › ' . $categoria->nome;
            $mapa[$chave] = $categoria;
        }

        return $mapa;
    }

    /**
     * Catálogo visível ao demo (globais + as dele), indexado pelo caminho.
     *
     * @return array<string, Categoria>
     */
    private function catalogoVisivel(User $demo): array
    {
        $categorias = Categoria::withoutGlobalScopes()
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $demo->id))
            ->get();

        $porId = $categorias->keyBy('id');
        $mapa = [];

        foreach ($categorias as $categoria) {
            $pai = $categoria->categoria_pai_id === null ? null : $porId->get($categoria->categoria_pai_id);
            $chave = $pai === null ? $categoria->nome : $pai->nome . ' › ' . $categoria->nome;
            $mapa[$chave] = $categoria;
        }

        return $mapa;
    }

    private function criarRendas(User $demo): void
    {
        foreach (self::RENDAS as $mesesAtras => $renda) {
            $salario = new Salario([
                'valor'       => $renda['valor'],
                'competencia' => $this->competencia($mesesAtras)->toDateString(),
                'descricao'   => $renda['descricao'],
            ]);
            $salario->user_id = $demo->id;
            $salario->save();
        }
    }

    /**
     * @param  array<string, Categoria>  $categorias
     */
    private function criarLancamentos(User $demo, array $categorias): int
    {
        $hoje = CarbonImmutable::today();
        $criados = 0;

        for ($mesesAtras = 0; $mesesAtras < self::COMPETENCIAS; $mesesAtras++) {
            $inicio = $this->competencia($mesesAtras);

            foreach (self::MOVIMENTOS as $movimento) {
                $valor = $movimento['valores'][$mesesAtras] ?? null;

                if ($valor === null) {
                    continue;
                }

                $caminho = $this->caminho($movimento['categoria']);
                $categoria = $categorias[$caminho] ?? null;

                // Falha alto e claro. Um `continue` silencioso aqui faria um
                // acento errado no nome da categoria sumir com o lançamento
                // sem que ninguém percebesse.
                if ($categoria === null) {
                    throw new RuntimeException("Categoria \"{$caminho}\" não existe no catálogo.");
                }

                // O dia pode não existir no mês (31 em fevereiro) e, no mês
                // corrente, não pode estar no futuro: lançamento com data à
                // frente de hoje faria o Dashboard contar dinheiro não gasto.
                $dia = min($movimento['dia'], $inicio->daysInMonth);
                $data = $inicio->setDay($dia);

                if ($data->greaterThan($hoje)) {
                    continue;
                }

                $gasto = new Gasto([
                    'descricao'    => $movimento['descricao'],
                    'valor'        => $valor,
                    'data'         => $data->toDateString(),
                    'categoria_id' => $categoria->id,
                ]);
                $gasto->user_id = $demo->id;
                $gasto->save();

                $criados++;
            }
        }

        return $criados;
    }

    /**
     * @param  array<string, Categoria>  $categorias
     */
    private function criarOrcamentos(User $demo, array $categorias): void
    {
        foreach (self::ORCAMENTOS as $nome => $limite) {
            $categoria = $categorias[$nome] ?? null;

            // O orçamento vive na mãe: uma subcategoria aqui seria um segundo
            // limite disputando o mesmo dinheiro.
            if ($categoria === null || $categoria->ehSubcategoria()) {
                throw new RuntimeException("Orçamento invalido para \"{$nome}\": precisa ser uma categoria principal existente.");
            }

            $orcamento = new Orcamento([
                'categoria_id' => $categoria->id,
                'valor_limite' => $limite,
                // Nulo é o limite recorrente: vale para qualquer mês sem exceção.
                'competencia'  => null,
            ]);
            $orcamento->user_id = $demo->id;
            $orcamento->save();
        }
    }

    private function criarMetas(User $demo): void
    {
        $hoje = CarbonImmutable::today();

        foreach (self::METAS as $definicao) {
            $meta = new Meta([
                'nome'           => $definicao['nome'],
                'valor_objetivo' => $definicao['objetivo'],
                'valor_atual'    => $definicao['atual'],
                'prazo'          => $definicao['prazo_em_meses'] === null
                    ? null
                    : $hoje->addMonths($definicao['prazo_em_meses'])->endOfMonth()->toDateString(),
                'concluida_em'   => $definicao['atual'] >= $definicao['objetivo'] ? $hoje->subDays(9) : null,
            ]);
            $meta->user_id = $demo->id;
            $meta->save();
        }
    }

    /** Primeiro dia da competência, contada para trás a partir do mês corrente. */
    private function competencia(int $mesesAtras): CarbonImmutable
    {
        return CarbonImmutable::today()->startOfMonth()->subMonths($mesesAtras);
    }

    /** @param  array<int, string>  $caminho */
    private function caminho(array $caminho): string
    {
        return implode(' › ', $caminho);
    }
}
