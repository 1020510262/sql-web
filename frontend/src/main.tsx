import React from 'react'
import ReactDOM from 'react-dom/client'
import { ModuleRegistry } from '@ag-grid-community/core'
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { loader } from '@monaco-editor/react'
import App from './App'
import './styles/index.css'

ModuleRegistry.registerModules([ClientSideRowModelModule])
loader.config({ paths: { vs: '/monaco/vs' } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
