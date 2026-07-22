import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import TopRibbon from './pages/TopRibbon'
import GameInformation from './pages/GameInformation'
import RecentMoves from './pages/RecentMoves'
import Board from './pages/Board'
import ChessReplay from './pages/ChessReplay'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/topRibbon" element={<TopRibbon />} />
        <Route path="/gameInformation" element={<GameInformation />} />
        <Route path="/recentMoves" element={<RecentMoves />} />
        <Route path="/board" element={<Board />} />
        <Route path="/replay" element={<ChessReplay />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
