<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use Illuminate\Validation\Rule;

/**
 * Edição de categoria.
 *
 * Herda de Store toda a checagem de nome inédito — a mesma pergunta ("esse nome
 * já está visível para mim?"), com a mesma normalização, e uma única exceção:
 * a própria categoria editada. Herdar em vez de repetir é o que garante que as
 * duas rotas nunca divirjam.
 */
class UpdateCategoriaRequest extends StoreCategoriaRequest
{
    public function rules(): array
    {
        return [
            'nome' => ['sometimes', 'required', 'string', 'max:100'],
            'tipo' => ['sometimes', 'required', Rule::enum(TipoCategoria::class)],
        ];
    }

    /** Renomear para o próprio nome não é conflito consigo mesma. */
    protected function idIgnorado(): ?int
    {
        $categoria = $this->route('categoria');

        return $categoria instanceof Categoria ? $categoria->getKey() : null;
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome da categoria.',
            'nome.max'      => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
