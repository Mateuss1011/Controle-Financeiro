<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

/**
 * Em produção a API fica atrás do proxy da hospedagem, e é o proxy quem fala
 * com o PHP. Sem `trustProxies`, o Laravel enxerga o IP e o protocolo DO
 * PROXY, não os do visitante.
 *
 * As duas consequências são silenciosas, que é o que torna este teste
 * necessário:
 *
 *  - o limitador por IP passaria a contar todo mundo como um visitante só, e
 *    o primeiro a errar a senha cinco vezes bloquearia o login dos demais;
 *  - `url()` geraria http:// num site servido por https://.
 *
 * Nada disso aparece em desenvolvimento, onde não há proxy. Apareceria em
 * produção, como um bug intermitente de bloqueio de login.
 */
class ProxyDeProducaoTest extends TestCase
{
    public function test_o_ip_do_visitante_vem_do_cabecalho_do_proxy(): void
    {
        $this->get('/up', ['X-Forwarded-For' => '203.0.113.9']);

        $this->assertSame(
            '203.0.113.9',
            $this->app['request']->ip(),
            'O IP do visitante deveria vir do X-Forwarded-For escrito pelo proxy.'
        );
    }

    public function test_o_protocolo_do_visitante_vem_do_cabecalho_do_proxy(): void
    {
        $this->get('/up', ['X-Forwarded-Proto' => 'https']);

        $this->assertTrue(
            $this->app['request']->isSecure(),
            'A requisição deveria ser reconhecida como HTTPS: é o proxy que termina o TLS.'
        );
    }

    /** Sem cabeçalho de proxy, nada muda — é o caso do ambiente local. */
    public function test_sem_proxy_o_ip_continua_sendo_o_da_conexao(): void
    {
        $this->get('/up');

        $this->assertSame('127.0.0.1', $this->app['request']->ip());
        $this->assertFalse($this->app['request']->isSecure());
    }
}
