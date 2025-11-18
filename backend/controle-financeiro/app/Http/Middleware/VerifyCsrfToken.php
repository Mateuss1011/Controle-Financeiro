<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // ✅ Esta linha permite que seu frontend faça POSTs/PUTs para a API
        // sem precisar de token CSRF, essencial para testes de API.
        'api/*'
    ];
}
