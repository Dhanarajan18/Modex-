import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// I'm using React 18's createRoot API for better performance
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
