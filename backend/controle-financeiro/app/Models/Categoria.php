<?php

namespace App\Models;

use App\Enums\TipoCategoria;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

/**
 * Categoria de gasto, classificada pela regra 50/30/20.
 *
 * user_id NULL = categoria global (padrão do sistema, visível a todos).
 * user_id preenchido = categoria privada daquele usuário.
 *
 * Por isso Categoria NÃO usa a trait BelongsToUser: o escopo não é "só o que é
 * meu", e sim "o que é meu OU global".
 *
 * DOIS NÍVEIS, e apenas dois: `categoria_pai_id` nulo é uma categoria
 * principal; preenchido, uma subcategoria. Um lançamento aponta para qualquer
 * um dos dois — "Moradia" e "Moradia › Aluguel" são ambos um `categoria_id`,
 * o que dispensou reescrever `gastos` para introduzir a hierarquia.
 *
 * O TIPO É DERIVADO, não escolhido, quando há pai. Uma subcategoria de Moradia
 * é necessidade porque Moradia é — não porque alguém marcou a caixa certa. A
 * derivação acontece em `saving`, então não existe caminho de escrita que
 * produza "Moradia = necessidade, Aluguel = desejo".
 */
class Categoria extends Model
{
    /** @use HasFactory<\Database\Factories\CategoriaFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'categoria_pai_id',
        'nome',
        'tipo',
    ];

    protected function casts(): array
    {
        return [
            'tipo' => TipoCategoria::class,
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('visiveis', function (Builder $query) {
            if (Auth::hasUser()) {
                $id = Auth::id();

                $query->where(fn (Builder $q) => $q
                    ->whereNull('categorias.user_id')
                    ->orWhere('categorias.user_id', $id));

                return;
            }

            if (! app()->runningInConsole()) {
                $query->whereRaw('1 = 0');
            }
        });

        /*
         * O tipo da subcategoria vem do pai, sempre.
         *
         * Fica em `saving` e não numa regra de validação porque validação se
         * contorna: um seeder, um comando de console ou um `update()` direto
         * passariam por cima. Aqui o valor é recalculado no caminho por onde
         * toda gravação passa, então a inconsistência não tem por onde entrar.
         */
        static::saving(function (Categoria $categoria) {
            if ($categoria->categoria_pai_id === null) {
                return;
            }

            $pai = static::withoutGlobalScopes()->find($categoria->categoria_pai_id);

            if ($pai) {
                $categoria->tipo = $pai->tipo;
            }
        });

        /*
         * Trocar o tipo de uma categoria principal reclassifica as filhas.
         *
         * Sem isto, mover "Saúde" de necessidade para desejo deixaria
         * "Academia" como necessidade — a inconsistência que o `saving` acima
         * impede na criação voltaria pela porta da edição.
         */
        static::updated(function (Categoria $categoria) {
            if ($categoria->categoria_pai_id !== null || ! $categoria->wasChanged('tipo')) {
                return;
            }

            static::withoutGlobalScopes()
                ->where('categoria_pai_id', $categoria->id)
                ->update(['tipo' => $categoria->tipo->value]);
        });
    }

    // ------------------------------------------------------------ hierarquia

    public function pai(): BelongsTo
    {
        return $this->belongsTo(self::class, 'categoria_pai_id');
    }

    public function filhas(): HasMany
    {
        return $this->hasMany(self::class, 'categoria_pai_id');
    }

    public function ehPrincipal(): bool
    {
        return $this->categoria_pai_id === null;
    }

    public function ehSubcategoria(): bool
    {
        return $this->categoria_pai_id !== null;
    }

    /**
     * O id pelo qual esta categoria é somada nos agregados financeiros.
     *
     * Uma subcategoria soma na mãe: quem orçou R$ 1.500 em Moradia espera que o
     * gasto em "Moradia › Aluguel" consuma esse limite. Sem isso o orçamento
     * ficaria eternamente zerado e o donut do Dashboard viraria trinta fatias.
     */
    public function raizId(): int
    {
        return $this->categoria_pai_id ?? $this->id;
    }

    /** Só categorias principais. */
    public function scopePrincipais(Builder $query): Builder
    {
        return $query->whereNull('categoria_pai_id');
    }

    /** Só subcategorias, opcionalmente de um pai específico. */
    public function scopeSubcategorias(Builder $query, ?int $paiId = null): Builder
    {
        return $query->whereNotNull('categoria_pai_id')
            ->when($paiId, fn (Builder $q) => $q->where('categoria_pai_id', $paiId));
    }

    /**
     * Expressão SQL da categoria raiz, para agrupar gastos.
     *
     * Coluna derivada seria mais rápida de ler e mais uma coisa a manter em dia;
     * `COALESCE` resolve com o dado que já existe e se comporta igual em MariaDB
     * e SQLite — diferença que já mordeu este projeto na Fase I, quando
     * `YEAR()/MONTH()` passavam em produção e quebravam nos testes.
     */
    public static function expressaoRaiz(string $tabela = 'categorias'): string
    {
        return "COALESCE({$tabela}.categoria_pai_id, {$tabela}.id)";
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gastos(): HasMany
    {
        return $this->hasMany(Gasto::class);
    }

    public function ehGlobal(): bool
    {
        return $this->user_id === null;
    }

    public function scopeGlobais(Builder $query): Builder
    {
        return $query->whereNull('user_id');
    }

    public function scopeDoTipo(Builder $query, TipoCategoria $tipo): Builder
    {
        return $query->where('tipo', $tipo->value);
    }

    /**
     * Diacríticos do alfabeto latino, para o dobramento de acentos.
     *
     * Escrita à mão porque a `ext-intl` não está instalada — sem ela não há
     * `Normalizer`, e `iconv('ASCII//TRANSLIT')` muda de resultado conforme o
     * sistema, que é exatamente o tipo de variação que esta classe existe para
     * eliminar.
     *
     * Só as maiúsculas ficam de fora: `mb_strtolower` roda antes.
     */
    private const DIACRITICOS = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n', 'ý' => 'y', 'ÿ' => 'y',
    ];

    /**
     * Nome reduzido à forma que decide se duas categorias são a mesma.
     *
     * ESTE É O ÚNICO LUGAR onde a comparação de nomes é definida. Store e
     * Update passam por aqui; qualquer outro ponto que precise comparar nomes
     * também deve.
     *
     * A regra não foi escolhida agora — ela já valia. A coluna `nome` é
     * `utf8mb4_unicode_ci` no MariaDB, que ignora caixa E acento: em produção
     * "Café" já colidia com "Cafe". O que mudou foi o LUGAR da regra. Ela vivia
     * na collation, então o SQLite dos testes discordava do MariaDB — `=` é
     * sensível à caixa lá, e `COLLATE NOCASE` só dobra A–Z ASCII, deixando
     * "ALIMENTAÇÃO" e "Alimentação" como nomes distintos. A suíte media um
     * comportamento que a produção não tinha.
     *
     * O dobramento cobre o alfabeto latino, que é o necessário para um produto
     * em português — NÃO é uma implementação geral de Unicode. Um nome em
     * grego ou cirílico com diacrítico ainda seria comparado de forma diferente
     * do que o MariaDB faria.
     */
    public static function normalizarNome(string $nome): string
    {
        return strtr(mb_strtolower(trim($nome), 'UTF-8'), self::DIACRITICOS);
    }
}
