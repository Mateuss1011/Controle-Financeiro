import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

export const GastosContext = createContext();


export function GastosProvider({ children }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  async function carregarCategorias() {
    try {
      const response = await api.get("/categorias");
      setCategorias(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  }

  async function carregarGastos() {
    try {
      const response = await api.get("/gastos");
      setGastos(response.data.data);
    } catch (error) {
      console.error("Erro ao carregar gastos:", error);
    }
  }

  async function deletarGasto(id) {
    await api.delete(`/gastos/${id}`);
    carregarGastos();
  }

  async function atualizarGasto(gasto) {
    await api.put(`/gastos/${gasto.id}`, {
      descricao: gasto.descricao,
      valor: gasto.valor,
      data: gasto.data,
      categoria_id: gasto.categoria.id,
    });
    carregarGastos();
  }

  useEffect(() => {
    carregarCategorias();
    carregarGastos();
  }, []);

  return (
    <GastosContext.Provider
      value={{
        gastos,
        categorias,
        carregarGastos,
        carregarCategorias,
        deletarGasto,
        atualizarGasto
      }}
    >
      {children}
    </GastosContext.Provider>
  );
}

export function useGastos() {
  return useContext(GastosContext);
}
