import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DndProvider } from 'react-dnd'
import { TouchBackend } from 'react-dnd-touch-backend'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
            <App />
        </DndProvider>
    </React.StrictMode>,
)
