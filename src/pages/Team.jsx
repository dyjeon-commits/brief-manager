import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

export default function Team() {
  const { supabase } = useAuth()
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'pm' })
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
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return
    setSaving(true); setError('')
    const { data, error: signUpError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
    })
    if (signUpError) {
      setError('계정 생성 실패: ' + signUpError.message)
      setSaving(false); return
    }
    await supabase.from('profiles').insert({ id: data.user.id, name: form.name, role: form.role })
    setSaving(false); setModal(false); setForm({ name: '', email: '', password: '', role: 'pm' }); load()
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
      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>PM 계정을 추가하면 본인이 담당한 외주/주제만 관리할 수 있어요.</p>

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
                {m.role === 'superadmin' ? '슈퍼어드민' : 'PM'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <h2>계정 추가</h2>
            <div className="fg"><label>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" /></div>
            <div className="fg"><label>이메일 *</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="pm@company.com" /></div>
            <div className="fg"><label>비밀번호 *</label><input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="6자 이상" /></div>
            <div className="fg">
              <label>역할</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="pm">PM</option>
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
