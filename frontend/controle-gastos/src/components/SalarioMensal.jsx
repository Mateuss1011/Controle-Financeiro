import React, { useState, useEffect } from "react";
import { Button, Form } from "react-bootstrap";
import { useSalario } from "../Context/useSalario";

export default function SalarioMensal() {
  const { salario, salarioId, atualizarSalario } = useSalario();
  const [valor, setValor] = useState("");
  const [mensagem, setMensagem] = useState(""); // 🔥 igual ao AdicionarGasto

  useEffect(() => {
    setValor(salario);
  }, [salario]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMensagem("");

    try {
      await atualizarSalario(valor);

      setMensagem("✅ Salário atualizado com sucesso!");

      // opcional: limpar no front (mas aqui nem é necessário)
      // setValor("");

    } catch (error) {
      console.error("Erro ao atualizar salário:", error);
      setMensagem(
        `❌ Erro: ${
          error.response?.data?.message || "Não foi possível atualizar."
        }`
      );
    }
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title fw-bold">💰 Salário Mensal</h5>

        {/* 🔥 mesma mensagem do design do AdicionarGasto */}
        {mensagem && (
          <p
            className={`text-center fw-bold ${
              mensagem.includes("Erro") ? "text-danger" : "text-success"
            }`}
          >
            {mensagem}
          </p>
        )}

        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <Form.Label>Valor (R$)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <Button variant="dark" type="submit" className="w-100">
            {salarioId ? "Atualizar Salário" : "Adicionar Salário"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
