import React, { useState } from "react";
import api from "../services/api";
import { Button, Form } from "react-bootstrap";
import { useGastos } from "../Context/GastosContext";

export default function AdicionarGasto() {
  // As categorias vêm do Context. Antes este componente fazia a própria
  // requisição, duplicando a chamada já feita pelo GastosProvider.
  const { carregarGastos, categorias } = useGastos();

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem("");

    try {
      // O header Authorization já é injetado pelo interceptor do api.jsx.
      await api.post("/gastos", {
        descricao,
        valor,
        data,
        categoria_id: categoriaId,
      });

      
      await carregarGastos();

      setMensagem("✅ Gasto adicionado com sucesso!");
      setDescricao("");
      setValor("");
      setData("");
      setCategoriaId("");

    } catch (error) {
      console.error("Erro ao adicionar gasto:", error);
      setMensagem(`❌ Erro: ${error.response?.data?.message || "Verifique os dados."}`);
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title fw-bold">Adicionar Gasto</h5>

        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <Form.Label>Descrição</Form.Label>
            <Form.Control
              type="text"
              placeholder="Digite a descrição do gasto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <Form.Label>Valor (R$)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <Form.Label>Data</Form.Label>
            <Form.Control
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <Form.Label>Categoria</Form.Label>
            <Form.Select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </Form.Select>
          </div>

          {mensagem && (
            <p
              className={`text-center fw-bold ${
                mensagem.includes("Erro") ? "text-danger" : "text-success"
              }`}
            >
              {mensagem}
            </p>
          )}

          <Button variant="dark" type="submit" className="w-100">
            Adicionar Gasto
          </Button>
        </Form>
      </div>
    </div>
  );
}
