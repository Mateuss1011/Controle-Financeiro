import axios from "axios";
import {
  avisarSessaoExpirada,
  lerToken,
  limparToken,
} from "./sessao";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = lerToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      limparToken();

      // Antes isto fazia `window.location.href = "/"`, recarregando a aplicação
      // inteira e, na própria tela de login, entrando em laço. Agora o
      // AuthProvider ouve o evento e derruba a sessão pelo roteador, sem reload
      // e preservando a rota que o usuário tentava abrir.
      avisarSessaoExpirada();
    }

    return Promise.reject(error);
  }
);

export default api;
