import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

export default function Team() {
  const { supabase } = useAuth()
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', uid: '', role: 'pm' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setMembers(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim() || !form.uid.trim()) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('profiles').insert({ id: form.uid.trim(), name: form.name.trim(), role: form.role })
    if (err) { setError('UID가 올바르지 않거나 이미 등록된 계정입니다.'); setSaving(false); return }
    setSaving(false); setModal(false); setForm({ name: '', uid: '', role: 'pm' }); load()
  }

  async function remove(id) {
    if (!confirm('이 계정을 삭제할까요?')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>팀 관리</h1>
        <button className="btn btn-primary" onClick={() => { setModal(true); setError('') }}>+ 계정 추가</button>
      </div>
      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1d4ed8' }}>
        💡 디렉터 계정 추가 순서: <strong>Supabase → Authentication → Users → Create new user</strong> 로 계정 만든 후, 여기서 이름과 UID를 등록하세요.
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
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>순서:</strong><br/>
              1. Supabase → Authentication → Users → Create new user<br/>
              2. 이메일 + 비밀번호 입력 후 생성<br/>
              3. 생성된 유저의 <strong style={{ color: 'var(--text)' }}>UID</strong>를 복사해서 아래에 붙여넣기
            </div>
            <div className="fg"><label>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" /></div>
            <div className="fg"><label>UID * (Supabase에서 복사)</label><input value={form.uid} onChange={e => setForm(p => ({ ...p, uid: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={{ fontFamily: 'monospace', fontSize: 12 }} /></div>
            <div className="fg">
              <label>역할</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="pm">디렉터</option>
                <option value="superadmin">슈퍼어드민</option>
              </select>
            </div>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '추가 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
