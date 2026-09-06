<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;

/**
 * Edição de categoria.
 *
 * Herda de Store toda a checagem — nome inédito com a mesma normalização, pai
 * válido, profundidade de dois níveis — e acrescenta duas exceções próprias:
 * ignorar a si mesma nas comparações, e recusar virar mãe de quem já tem
 * filhas. Herdar em vez de repetir é o que garante que criar e editar nunca
 * divirjam.
 */
class UpdateCategoriaRequest extends StoreCategoriaRequest
{
    public function rules(): array
    {
        return [
            'nome'             => ['sometimes', 'required', 'string', 'max:100'],
            'categoria_pai_id' => ['sometimes', 'nullable', 'integer'],
            'tipo'             => ['sometimes', 'required', Rule::enum(TipoCategoria::class)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $this->conferirPai($validator);
                $this->conferirNaoTemFilhas($validator);
                $this->conferirNomeInedito($validator);
            },
        ];
    }

    /**
     * Uma categoria com filhas não pode virar subcategoria — isso criaria o
     * terceiro nível pela porta dos fundos: as filhas dela passariam a ser
     * netas da nova mãe.
     */
    protected function conferirNaoTemFilhas(Validator $validator): void
    {
        if ($this->input('categoria_pai_id') === null || $validator->errors()->has('categoria_pai_id')) {
            return;
        }

        $categoria = $this->route('categoria');

        if (! $categoria instanceof Categoria) {
            return;
        }

        $temFilhas = Categoria::withoutGlobalScope('visiveis')
            ->where('categoria_pai_id', $categoria->getKey())
            ->exists();

        if ($temFilhas) {
            $validator->errors()->add(
                'categoria_pai_id',
                'Esta categoria tem subcategorias e não pode virar subcategoria de outra.'
            );
        }
    }

    /**
     * Na edição, o nome é comparado dentro do pai que a categoria TERÁ depois
     * de salva — que pode não ser o que veio no payload, quando o campo nem foi
     * enviado.
     */
    protected function paiParaComparacao(): ?int
    {
        if ($this->has('categoria_pai_id')) {
            return $this->input('categoria_pai_id') === null
                ? null
                : (int) $this->input('categoria_pai_id');
        }

        $categoria = $this->route('categoria');

        return $categoria instanceof Categoria ? $categoria->categoria_pai_id : null;
    }

    protected function conferirNomeInedito(Validator $validator): void
    {
        $nome = $this->input('nome');

        if (! is_string($nome) || $validator->errors()->has('nome')) {
            return;
        }

        $normalizado = Categoria::normalizarNome($nome);
        $paiId = $this->paiParaComparacao();

        $conflito = Categoria::withoutGlobalScope('visiveis')
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $this->user()->id))
            ->when($paiId === null,
                fn ($q) => $q->whereNull('categoria_pai_id'),
                fn ($q) => $q->where('categoria_pai_id', $paiId))
            ->when($this->idIgnorado(), fn ($q, $id) => $q->whereKeyNot($id))
            ->get(['id', 'nome'])
            ->contains(fn (Categoria $existente) => Categoria::normalizarNome($existente->nome) === $normalizado);

        if ($conflito) {
            $validator->errors()->add(
                'nome',
                $paiId === null
                    ? 'Já existe uma categoria com esse nome.'
                    : 'Já existe uma subcategoria com esse nome nesta categoria.'
            );
        }
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
            'categoria_pai_id.integer' => 'A categoria selecionada é inválida.',
        ];
    }
}
