<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index()
    {
        return Categoria::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
        ]);

        return Categoria::create($validated);
    }

    public function show($id)
    {
        return Categoria::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $categoria = Categoria::findOrFail($id);

        $validated = $request->validate([
            'nome' => 'string|max:255',
        ]);

        $categoria->update($validated);

        return $categoria;
    }

    public function destroy($id)
    {
        Categoria::destroy($id);

        return response()->json(['message' => 'Categoria deletada com sucesso.']);
    }
}
