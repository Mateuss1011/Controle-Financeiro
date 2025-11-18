<?php

namespace App\Http\Controllers;

use App\Models\Gasto;
use Illuminate\Http\Request;
// ❗ Adiciona essa linha caso ainda não tenha o resource
use App\Http\Resources\GastoResource;

class GastoController extends Controller
{
    public function index()
    {
        // ✅ Retorna os gastos com categoria e salário (se tiver)
        return GastoResource::collection(
            Gasto::with(['categoria', 'salario'])->get()
        );
    }

    public function store(Request $request)
    {
        // ✅ Agora o salario_id é opcional
        $validated = $request->validate([
            'descricao' => 'required|string|max:255',
            'valor' => 'required|numeric',
            'data' => 'required|date',
            'categoria_id' => 'required|exists:categorias,id',
            'salario_id' => 'nullable|exists:salarios,id',
        ]);

        // ✅ Cria o gasto
        $gasto = Gasto::create($validated);

        // ✅ Retorna um JSON bonitinho
        return response()->json([
            'message' => 'Gasto adicionado com sucesso!',
            'data' => $gasto
        ], 201);
    }

    public function show($id)
    {
        return Gasto::with(['categoria', 'salario'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $gasto = Gasto::findOrFail($id);

        $validated = $request->validate([
            'descricao' => 'string|max:255',
            'valor' => 'numeric',
            'data' => 'date',
            'categoria_id' => 'exists:categorias,id',
            'salario_id' => 'exists:salarios,id',
        ]);

        $gasto->update($validated);

        return response()->json([
            'message' => 'Gasto atualizado com sucesso!',
            'data' => $gasto
        ]);
    }

    public function destroy($id)
    {
        Gasto::destroy($id);

        return response()->json(['message' => 'Gasto deletado com sucesso.']);
    }
}
