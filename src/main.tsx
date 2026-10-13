import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Catch unhandled quota exhaustion or Firestore offline events cleanly
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const str = String(reason?.code || reason?.message || reason).toLowerCase();
  if (str.includes('resource-exhausted') || str.includes('quota') || str.includes('limit exceeded')) {
    event.preventDefault();
    console.warn('[Firestore] Quota limit event handled gracefully. Using local cache.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

