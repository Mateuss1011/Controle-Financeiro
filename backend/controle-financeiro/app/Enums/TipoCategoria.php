<?php

namespace App\Enums;

/**
 * Classificação de uma categoria dentro da regra 50/30/20.
 *
 * Os percentuais aqui são a ÚNICA fonte de verdade da regra em todo o sistema.
 */
enum TipoCategoria: string
{
    case Necessidade = 'necessidade';
    case Desejo      = 'desejo';
    case Poupanca    = 'poupanca';

    /** Fração da renda destinada a este tipo pela regra 50/30/20. */
    public function percentual(): float
    {
        return match ($this) {
            self::Necessidade => 0.50,
            self::Desejo      => 0.30,
            self::Poupanca    => 0.20,
        };
    }

    public function rotulo(): string
    {
        return match ($this) {
            self::Necessidade => 'Necessidades',
            self::Desejo      => 'Desejos',
            self::Poupanca    => 'Poupança',
        };
    }

    /**
     * Poupança é uma meta a atingir; necessidades e desejos são tetos a respeitar.
     * Isso muda a leitura do status: 100% de poupança é bom, 100% de desejos não.
     */
    public function ehMeta(): bool
    {
        return $this === self::Poupanca;
    }

    /** @return array<int, string> */
    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
