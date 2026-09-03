<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Gasto extends Model
{
    /** @use HasFactory<\Database\Factories\GastoFactory> */
    use BelongsToUser, HasFactory;

    protected $fillable = [
        'user_id',
        'descricao',
        'valor',
        'data',
        'categoria_id',
        'salario_id',
    ];

    protected function casts(): array
    {
        return [
            'data'  => 'date',
            'valor' => 'decimal:2',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function salario(): BelongsTo
    {
        return $this->belongsTo(Salario::class);
    }

    /** Gastos de uma competência, definida sempre pela data do lançamento. */
    public function scopeDaCompetencia(Builder $query, int $ano, int $mes): Builder
    {
        return $query->whereYear('data', $ano)->whereMonth('data', $mes);
    }

    public function scopeEntre(Builder $query, string $inicio, string $fim): Builder
    {
        return $query->whereBetween('data', [$inicio, $fim]);
    }
}
