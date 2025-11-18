import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api", // base da tua API Laravel
});

// ✅ Intercepta todas as requisições e adiciona o token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // pega o token salvo no login
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Intercepta respostas com erro (ex: token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Sessão expirada. Faça login novamente.");
      localStorage.removeItem("token");
      window.location.href = "/"; // redireciona pra tela de login
    }
    return Promise.reject(error);
  }
);

export default api;
