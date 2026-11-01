import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './estilos.css';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
