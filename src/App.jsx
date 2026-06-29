import React, { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Dashboard from './pages/Dashboard'
import Assignments from './pages/Assignments'
import Topics from './pages/Topics'
import Designers from './pages/Designers'
import Labels from './pages/Labels'
import Team from './pages/Team'
import Login from './pages/Login'
import './App.css'

function AppInner() {
  const { user, profile, loading, signOut } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 15 }}>
      불러오는 중...
    </div>
  )

  if (!user || !profile) return <Login />

  const isSuperadmin = profile.role === 'superadmin'

  const NAV = [
    { id: 'dashboard',   label: '대시보드',  icon: '⊞' },
    { id: 'assignments', label: '배정 현황', icon: '📋' },
    { id: 'topics',      label: '작업주제',  icon: '📁' },
    { id: 'designers',   label: '디자이너',  icon: '👤' },
    { id: 'labels',      label: '라벨 관리', icon: '🏷️' },
    ...(isSuperadmin ? [{ id: 'team', label: '팀 관리', icon: '👥' }] : []),
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">기획서 배정</div>
        <nav>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{profile.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
            {isSuperadmin ? '슈퍼어드민' : 'PM'}
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px', width: '100%' }} onClick={signOut}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        {page === 'dashboard'   && <Dashboard onNavigate={setPage} />}
        {page === 'assignments' && <Assignments />}
        {page === 'topics'      && <Topics />}
        {page === 'designers'   && <Designers />}
        {page === 'labels'      && <Labels />}
        {page === 'team'        && isSuperadmin && <Team />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
