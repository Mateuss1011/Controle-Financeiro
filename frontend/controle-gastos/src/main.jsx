import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ordem importa: o Bootstrap entra primeiro e as camadas do produto depois,
// para que os tokens prevaleçam onde houver sobreposição.
import 'bootstrap/dist/css/bootstrap.min.css';
import "@fontsource/poppins";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import './styles/tokens.css';
import './styles/base.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
