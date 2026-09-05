<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class StoreCategoriaRequest extends FormRequest
{
    /**
     * `tipo` passa a ser obrigatório e explícito. Antes ele era omitido pelo
     * controller e o MariaDB gravava silenciosamente o primeiro valor do ENUM
     * ('necessidade'), classificando a categoria errado na regra 50/30/20.
     */
    public function rules(): array
    {
        return [
            'nome' => [
                'required',
                'string',
                'max:100',
                $this->nomeInedito(),
            ],
            'tipo' => ['required', Rule::enum(TipoCategoria::class)],
        ];
    }

    /**
     * O nome tem de ser inédito entre as categorias VISÍVEIS, não só entre as
     * próprias.
     *
     * A regra antiga olhava apenas `user_id = eu`, então dava para criar uma
     * "Alimentação" privada convivendo com a "Alimentação" global. As duas
     * apareciam idênticas no seletor de lançamento, sem nada que as
     * distinguisse, e cada uma somava para um lado do relatório.
     */
    protected function nomeInedito(): Unique
    {
        return Rule::unique('categorias', 'nome')->where(
            fn (Builder $query) => $query->where(
                fn (Builder $visivel) => $visivel
                    ->whereNull('user_id')
                    ->orWhere('user_id', $this->user()->id)
            )
        );
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome da categoria.',
            'nome.unique'   => 'Já existe uma categoria com esse nome.',
            'nome.max'      => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
