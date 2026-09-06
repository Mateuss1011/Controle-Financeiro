<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoriaRequest extends FormRequest
{
    /**
     * `tipo` é obrigatório na categoria principal e IGNORADO na subcategoria,
     * que herda o do pai. Antes, o controller omitia o campo e o MariaDB
     * gravava em silêncio o primeiro valor do ENUM, classificando a categoria
     * na faixa errada da regra 50/30/20.
     */
    public function rules(): array
    {
        return [
            'nome'             => ['required', 'string', 'max:100'],
            'categoria_pai_id' => ['sometimes', 'nullable', 'integer'],
            'tipo'             => [
                Rule::requiredIf(fn () => $this->input('categoria_pai_id') === null),
                'nullable',
                Rule::enum(TipoCategoria::class),
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $this->conferirPai($validator);
                $this->conferirNomeInedito($validator);
            },
        ];
    }

    /**
     * O pai precisa existir, ser visível para quem pede e ser uma categoria
     * PRINCIPAL.
     *
     * A profundidade para em dois níveis aqui. Não está no schema porque o
     * MariaDB não aceita CHECK com subconsulta — então a regra vive onde pode
     * ser expressa, com teste que a segura.
     */
    protected function conferirPai(Validator $validator): void
    {
        $paiId = $this->input('categoria_pai_id');

        if ($paiId === null || $validator->errors()->has('categoria_pai_id')) {
            return;
        }

        // `Categoria::find` respeita o escopo `visiveis`: o pai de outra pessoa
        // simplesmente não existe para quem está pedindo.
        $pai = Categoria::find($paiId);

        if (! $pai) {
            $validator->errors()->add('categoria_pai_id', 'A categoria selecionada é inválida.');

            return;
        }

        if ($pai->ehSubcategoria()) {
            $validator->errors()->add(
                'categoria_pai_id',
                'Uma subcategoria não pode ter subcategorias.'
            );

            return;
        }

        if ($this->idIgnorado() !== null && (int) $paiId === $this->idIgnorado()) {
            $validator->errors()->add('categoria_pai_id', 'Uma categoria não pode ser mãe de si mesma.');
        }
    }

    /**
     * O nome tem de ser inédito entre as categorias visíveis DO MESMO NÍVEL —
     * as globais mais as do próprio usuário, comparadas pela forma normalizada.
     *
     * O escopo é o pai, e não o catálogo inteiro: "Manutenção" é legítima em
     * Moradia e em Transporte, e tratá-las como conflito obrigaria a inventar
     * nomes como "Manutenção do carro" só para contornar a validação.
     *
     * A comparação é em PHP porque nenhuma função de banco produz o mesmo
     * resultado nos dois motores: o MariaDB usa utf8mb4_unicode_ci e ignora
     * caixa e acento; o SQLite dos testes é sensível aos dois.
     */
    protected function conferirNomeInedito(Validator $validator): void
    {
        $nome = $this->input('nome');

        if (! is_string($nome) || $validator->errors()->has('nome')) {
            return;
        }

        $normalizado = Categoria::normalizarNome($nome);
        $paiId = $this->input('categoria_pai_id');

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

    /** Na criação não há categoria a ignorar; na edição, a própria. */
    protected function idIgnorado(): ?int
    {
        return null;
    }

    public function messages(): array
    {
        return [
            'nome.required'    => 'Informe o nome da categoria.',
            'nome.max'         => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required'    => 'Selecione o tipo da categoria.',
            'tipo.enum'        => 'O tipo deve ser necessidade, desejo ou poupanca.',
            'categoria_pai_id.integer' => 'A categoria selecionada é inválida.',
        ];
    }
}
