import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { I18nProvider } from './i18n/I18nContext';
import { DataProvider } from './context/DataContext';
import './index.css';

const tree = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <I18nProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </I18nProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

const container = document.getElementById('root')!;
// Prerendered SEO pages ship real HTML inside #root; render over it either way.
container.innerHTML = '';
createRoot(container).render(tree);

// Register the service worker for offline support (no-op in dev).
registerSW({ immediate: true });
