import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Filter quota exhaustion and maximum backoff warning noise from console
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map(a => String(a?.message || a || '')).join(' ').toLowerCase();
  if (
    msg.includes('resource-exhausted') || 
    msg.includes('quota limit exceeded') || 
    msg.includes('maximum backoff delay') ||
    msg.includes('free daily write units')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Catch unhandled quota exhaustion or Firestore offline events cleanly
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const str = String(reason?.code || reason?.message || reason).toLowerCase();
  if (str.includes('resource-exhausted') || str.includes('quota') || str.includes('limit exceeded')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

