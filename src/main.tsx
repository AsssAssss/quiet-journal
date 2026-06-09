import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { bootstrapNative } from './infrastructure/platform/nativeBootstrap';
import { startAutoSync } from './presentation/state/autoSyncWatcher';
import './presentation/theme/globalStyles.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
bootstrapNative();
startAutoSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
