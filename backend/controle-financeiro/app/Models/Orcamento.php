<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Limite de gasto de uma categoria.
 *
 * competencia NULL = recorrente (vale para qualquer mês sem exceção definida).
 */
class Orcamento extends Model
{
    /** @use HasFactory<\Database\Factories\OrcamentoFactory> */
    use BelongsToUser, HasFactory;

    protected $table = 'orcamentos';

    protected $fillable = [
        'user_id',
        'categoria_id',
        'competencia',
        'valor_limite',
    ];

    protected function casts(): array
    {
        return [
            'competencia'  => 'date',
            'valor_limite' => 'decimal:2',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function ehRecorrente(): bool
    {
        return $this->competencia === null;
    }

    public function scopeRecorrentes(Builder $query): Builder
    {
        return $query->whereNull('competencia');
    }

    public function scopeDaCompetencia(Builder $query, int $ano, int $mes): Builder
    {
        return $query->whereYear('competencia', $ano)->whereMonth('competencia', $mes);
    }
}
