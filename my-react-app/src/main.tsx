import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';
import './styles.css';
import { ThemeProvider } from './components/theme/theme-provider';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element with id "root" not found');
}

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);


