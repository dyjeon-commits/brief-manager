import React, { useState, useEffect } from 'react'
import { getTeam, addTeamMember, deleteTeamMember } from '../api'

export default function Team() {
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'pm' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setMembers(await getTeam())
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) return
    const name = form.name.trim(), role = form.role
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMembers(prev => [...prev, { id: tempId, name, role }])
    setModal(false); setForm({ name: '', role: 'pm' })
    try {
      const result = await addTeamMember(name, role)
      setMembers(prev => prev.map(m => m.id === tempId ? result : m))
    } catch (err) {
      setMembers(prev => prev.filter(m => m.id !== tempId))
      alert('등록에 실패했습니다: ' + err.message)
    }
  }

  async function remove(id) {
    if (!confirm('이 계정을 삭제할까요?')) return
    const prevMembers = members
    setMembers(prev => prev.filter(m => m.id !== id))
    try {
      await deleteTeamMember(id)
    } catch (err) {
      setMembers(prevMembers)
      alert('삭제 실패: ' + err.message)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>팀 관리</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ 계정 추가</button>
      </div>
      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1d4ed8' }}>
        💡 이름만 등록하면 바로 로그인 가능합니다 (비밀번호 없음 — 사내망에서만 접속 가능한 앱이라 이름만으로 구분합니다).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
        {members.map(m => (
          <div key={m.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.role === 'superadmin' ? '#fef3c7' : 'var(--accent-bg)', color: m.role === 'superadmin' ? '#d97706' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                {m.name[0]}
              </div>
              {m.role !== 'superadmin' && (
                <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => remove(m.id)}>삭제</button>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: m.role === 'superadmin' ? '#fef3c7' : 'var(--accent-bg)', color: m.role === 'superadmin' ? '#d97706' : 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {m.role === 'superadmin' ? '슈퍼어드민' : '디렉터'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <h2>디렉터 계정 등록</h2>
            <div className="fg"><label>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" /></div>
            <div className="fg">
              <label>역할</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="pm">디렉터</option>
                <option value="superadmin">슈퍼어드민</option>
              </select>
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
