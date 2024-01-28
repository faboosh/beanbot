import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import "./styles/base.css";
import "./styles/colorsystem.css";
import "./styles/flex.css";
import "./styles/spacing.css";
import "./styles/main.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
