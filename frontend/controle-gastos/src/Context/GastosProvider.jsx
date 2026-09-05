import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { extrairErro } from "../lib/erros";
import { GastosContext } from "./gastosContext";

export function GastosProvider({ children }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [erroCategorias, setErroCategorias] = useState(null);

  /*
   * A lista de categorias tem UM dono, este provider.
   *
   * A tela de Categorias podia ter o proprio hook, mas ai a mesma lista teria
   * duas copias: uma na tela e outra alimentando o seletor do formulario de
   * lancamento. Renomear uma categoria numa e deixar a outra desatualizada
   * seria questao de tempo. O preco de centralizar e este provider precisar
   * carregar/erro proprios — que a tela consome como consumiria os seus.
   */
  const carregarCategorias = useCallback(async () => {
    setCarregandoCategorias(true);
    setErroCategorias(null);

    try {
      const response = await api.get("/categorias");
      setCategorias(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setErroCategorias(extrairErro(error));
    } finally {
      setCarregandoCategorias(false);
    }
  }, []);

  async function carregarGastos() {
    try {
      const response = await api.get("/gastos");
      setGastos(Array.isArray(response.data?.data) ? response.data.data : []);
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
      data: gasto.data_lancamento,
      categoria_id: gasto.categoria.id,
    });
    carregarGastos();
  }

  useEffect(() => {
    // Sem guarda de token: este provider só é montado dentro da RotaProtegida,
    // ou seja, com usuário já confirmado.
    carregarCategorias();
    carregarGastos();
  }, [carregarCategorias]);

  return (
    <GastosContext.Provider
      value={{
        gastos,
        categorias,
        carregandoCategorias,
        erroCategorias,
        carregarGastos,
        carregarCategorias,
        deletarGasto,
        atualizarGasto,
      }}
    >
      {children}
    </GastosContext.Provider>
  );
}
