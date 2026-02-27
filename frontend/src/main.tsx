import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Application from './pages/Application.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>  
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/application" element={<Application />} />
    </Routes>
  </BrowserRouter>
  </StrictMode>
)
