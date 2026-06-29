import React, { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Assignments from './pages/Assignments'
import Topics from './pages/Topics'
import Designers from './pages/Designers'
import './App.css'

const NAV = [
  { id: 'dashboard',   label: '대시보드',  icon: '⊞' },
  { id: 'assignments', label: '배정 현황', icon: '📋' },
  { id: 'topics',      label: '작업주제',  icon: '📁' },
  { id: 'designers',   label: '디자이너',  icon: '👤' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">기획서 배정</div>
        <nav>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === 'dashboard'   && <Dashboard onNavigate={setPage} />}
        {page === 'assignments' && <Assignments />}
        {page === 'topics'      && <Topics />}
        {page === 'designers'   && <Designers />}
      </main>
    </div>
  )
}
