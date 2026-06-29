import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DesignerView from './pages/DesignerView'

const pathMatch = window.location.pathname.match(/^\/view\/(.+)/)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {pathMatch ? <DesignerView token={pathMatch[1]} /> : <App />}
  </React.StrictMode>
)
