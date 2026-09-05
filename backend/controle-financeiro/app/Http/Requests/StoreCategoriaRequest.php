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
     * `tipo` passa a ser obrigatório e explícito. Antes ele era omitido pelo
     * controller e o MariaDB gravava silenciosamente o primeiro valor do ENUM
     * ('necessidade'), classificando a categoria errado na regra 50/30/20.
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:100'],
            'tipo' => ['required', Rule::enum(TipoCategoria::class)],
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => $this->conferirNomeInedito($validator)];
    }

    /**
     * O nome tem de ser inédito entre as categorias VISÍVEIS — as globais mais
     * as do próprio usuário —, comparadas pela forma normalizada.
     *
     * Duas coisas foram aprendidas aqui, em fases diferentes:
     *
     *  - a regra olhava só `user_id = eu`, então dava para criar uma
     *    "Alimentação" privada convivendo com a global. As duas apareciam
     *    idênticas no seletor de lançamento, e cada uma somava para um lado do
     *    relatório;
     *  - a comparação era feita pelo `Rule::unique`, ou seja, PELO BANCO. O
     *    MariaDB usa `utf8mb4_unicode_ci` e ignora caixa e acento; o SQLite dos
     *    testes é sensível aos dois. A regra existia, mas cada ambiente tinha a
     *    sua. Agora ela mora em `Categoria::normalizarNome()` e vale igual nos
     *    dois.
     *
     * A checagem é em PHP, e não em SQL, justamente por isso: nenhuma função do
     * banco produz o mesmo resultado nos dois motores. O conjunto é pequeno por
     * natureza — as globais do sistema mais as que o próprio usuário criou à
     * mão.
     */
    protected function conferirNomeInedito(Validator $validator): void
    {
        $nome = $this->input('nome');

        // Um nome que já falhou em `required`/`string` não chega a ser conflito.
        if (! is_string($nome) || $validator->errors()->has('nome')) {
            return;
        }

        $normalizado = Categoria::normalizarNome($nome);

        $conflito = Categoria::withoutGlobalScope('visiveis')
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $this->user()->id))
            ->when($this->idIgnorado(), fn ($q, $id) => $q->whereKeyNot($id))
            ->get(['id', 'nome'])
            ->contains(fn (Categoria $existente) => Categoria::normalizarNome($existente->nome) === $normalizado);

        if ($conflito) {
            $validator->errors()->add('nome', 'Já existe uma categoria com esse nome.');
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
            'nome.required' => 'Informe o nome da categoria.',
            'nome.max'      => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
