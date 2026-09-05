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
 */
class Categoria extends Model
{
    /** @use HasFactory<\Database\Factories\CategoriaFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
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
