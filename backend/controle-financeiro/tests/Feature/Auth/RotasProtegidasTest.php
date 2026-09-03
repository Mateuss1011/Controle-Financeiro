<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * O bug mais grave do diagnóstico: toda a API respondia 200 sem token algum.
 * Este teste existe para que isso não possa voltar sem quebrar o build.
 */
class RotasProtegidasTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{string, string}> */
    public static function rotasFinanceiras(): array
    {
        return [
            'listar gastos'      => ['GET', '/api/gastos'],
            'criar gasto'        => ['POST', '/api/gastos'],
            'ver gasto'          => ['GET', '/api/gastos/1'],
            'editar gasto'       => ['PUT', '/api/gastos/1'],
            'excluir gasto'      => ['DELETE', '/api/gastos/1'],
            'listar categorias'  => ['GET', '/api/categorias'],
            'criar categoria'    => ['POST', '/api/categorias'],
            'editar categoria'   => ['PUT', '/api/categorias/1'],
            'excluir categoria'  => ['DELETE', '/api/categorias/1'],
            'listar rendas'      => ['GET', '/api/rendas'],
            'registrar renda'    => ['POST', '/api/rendas'],
            'ver renda'          => ['GET', '/api/rendas/1'],
            'excluir renda'      => ['DELETE', '/api/rendas/1'],
            'regra 50/30/20'     => ['GET', '/api/regra'],
            'logout'             => ['POST', '/api/logout'],
            'me'                 => ['GET', '/api/me'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('rotasFinanceiras')]
    public function test_rota_sem_token_devolve_401(string $metodo, string $uri): void
    {
        $this->json($metodo, $uri)->assertStatus(401);
    }

    /**
     * Sem o header Accept, o Laravel tentaria redirecionar para a rota nomeada
     * `login` — que não existe numa API — e estouraria 500.
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('rotasFinanceiras')]
    public function test_rota_sem_token_e_sem_accept_json_tambem_devolve_401(string $metodo, string $uri): void
    {
        $resposta = $this->call($metodo, $uri);

        $resposta->assertStatus(401);
        $this->assertStringNotContainsString('Route [login] not defined', $resposta->getContent());
    }

    public function test_token_invalido_devolve_401(): void
    {
        $this->withHeader('Authorization', 'Bearer token-falso')
            ->getJson('/api/gastos')
            ->assertStatus(401);
    }

    public function test_resposta_de_erro_nao_expoe_stack_trace(): void
    {
        $conteudo = $this->getJson('/api/gastos')->getContent();

        $this->assertStringNotContainsString('vendor\\laravel', $conteudo);
        $this->assertStringNotContainsString('"trace"', $conteudo);
    }
}
