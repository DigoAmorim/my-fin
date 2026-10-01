import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './tailwind.css';
import { i18nReady } from './i18n';
import App from './App.tsx';

// Aguarda a inicialização das traduções para evitar renderizar a tela com textos ainda não carregados.
void i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Toaster position="bottom-right" richColors />
    </StrictMode>,
  );
});
