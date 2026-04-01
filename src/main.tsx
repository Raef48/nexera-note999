import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Global error handler to suppress external script errors
window.addEventListener('error', (event) => {
  // Ignore YouTube-related DOM manipulation errors
  if (event.message?.includes('Failed to execute \'removeChild\'') ||
      event.filename?.includes('contentYt.js') ||
      event.filename?.includes('youtube')) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
