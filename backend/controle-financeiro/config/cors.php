<?php

/*
 * Sem este arquivo o Laravel usa o default do framework, que libera
 * allowed_origins = ['*'] para toda a API. Aqui a origem permitida passa a ser
 * explícita e configurável por ambiente.
 */
return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', (string) env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // A API é stateless (Bearer token); não há cookie de sessão para enviar.
    'supports_credentials' => false,

];
