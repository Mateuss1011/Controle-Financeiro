<?php

namespace App\Http\Controllers;

use App\Models\Salario;
use Illuminate\Http\Request;

class SalarioController extends Controller
{
    public function index()
    {
        return Salario::latest('id')->get();
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
           'valor' => 'required|numeric|min:0'
        ]);

         $salario = Salario::create($validated);

        return response()->json([
            'message' => 'Salário registrado com sucesso!'
        ], 201);
    }


    public function show($id)
    {
        return Salario::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $salario = Salario::findOrFail($id);

        $validated = $request->validate([
            'valor' => 'numeric'
        ]);

        $salario->update($validated);

        return $salario;
    }

    public function destroy($id)
    {
        Salario::destroy($id);

        return response()->json(['message' => 'Salário deletado com sucesso.']);
    }

    public function regra()
    {
        $salario = \App\Models\Salario::latest()->first();

        if (!$salario) {
            return response()->json([
                'necessidades' => 0,
                'desejos' => 0,
                'poupanca' => 0
            ]);
        }

        $valor = $salario->valor;

        return response()->json([
            'necessidades' => $valor * 0.5,
            'desejos' => $valor * 0.3,
            'poupanca' => $valor * 0.2,
        ]);
    }

}
