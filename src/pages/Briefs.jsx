import React, { useState, useEffect } from 'react'
import { getBriefs, getDesigners, addBrief, updateBrief, deleteBrief, assignBrief, updateBriefStatus } from '../store'

const STATUS_OPTIONS = [
  { value: 'unassigned', label: '미배정' },
  { value: 'assigned',   label: '배정됨' },
  { value: 'inprogress', label: '작업중' },
  { value: 'completed',  label: '완료' },
]

const EMPTY = { title: '', description: '', deadline: '', designerId: '' }

export default function Briefs() {
  const [briefs, setBriefs] = useState([])
  const [designers, setDesigners] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  function load() {
    setBriefs(getBriefs())
    setDesigners(getDesigners())
  }

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(b) {
    setForm({ title: b.title, description: b.description || '', deadline: b.deadline || '', designerId: b.designerId || '' })
    setEditId(b.id)
    setModal(true)
  }

  function save() {
    if (!form.title.trim()) return
    const data = { ...form, designerId: form.designerId ? Number(form.designerId) : null }
    if (editId) {
      const existing = briefs.find(b => b.id === editId)
      let status = existing.status
      if (!data.designerId) status = 'unassigned'
      else if (status === 'unassigned') status = 'assigned'
      updateBrief({ id: editId, ...data, status })
    } else {
      addBrief(data)
    }
    setModal(false)
    load()
  }

  const designerMap = Object.fromEntries(designers.map(d => [d.id, d]))
  const isOverdue = b => b.deadline && b.status !== 'completed' && new Date(b.deadline) < new Date()

  const filtered = briefs.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    const q = search.toLowerCase()
    if (q && !b.title.toLowerCase().includes(q) && !(designerMap[b.designerId]?.name || '').toLowerCase().includes(q)) return false
    return true
  }).reverse()

  const tdStyle = { padding: '11px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }
  const thStyle = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)' }

  return (
    <div>
      <div className="ph">
        <h1>기획서 목록</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ 기획서 추가</button>
      </div>

      {/* 툴바 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          style={{ flex: 1, maxWidth: 280, padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}
          placeholder="제목 또는 디자이너 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ value: 'all', label: '전체' }, ...STATUS_OPTIONS].map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: filterStatus === s.value ? 'var(--accent-bg)' : 'transparent',
                color: filterStatus === s.value ? 'var(--accent)' : 'var(--text2)',
                border: filterStatus === s.value ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📋</div>
          <p>기획서가 없습니다.</p>
          {filterStatus === 'all' && !search && <button className="btn btn-primary" onClick={openAdd}>첫 기획서 추가하기</button>}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>제목</th>
                <th style={thStyle}>배정 디자이너</th>
                <th style={thStyle}>마감일</th>
                <th style={thStyle}>상태</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ background: isOverdue(b) ? '#fff5f5' : i % 2 === 0 ? undefined : '#fafafa' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{b.title}</div>
                    {b.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{b.description}</div>}
                  </td>
                  <td style={tdStyle}>
                    <select
                      style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--surface)', fontSize: 13, cursor: 'pointer', maxWidth: 150 }}
                      value={b.designerId || ''}
                      onChange={e => { assignBrief(b.id, e.target.value ? Number(e.target.value) : null); load() }}
                    >
                      <option value="">미배정</option>
                      {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, color: isOverdue(b) ? 'var(--danger)' : undefined }}>
                    {b.deadline || '-'}
                    {isOverdue(b) && <span style={{ marginLeft: 6, fontSize: 11, background: '#fee2e2', color: 'var(--danger)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>마감초과</span>}
                  </td>
                  <td style={tdStyle}>
                    <select
                      style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--surface)', fontSize: 13, cursor: 'pointer' }}
                      value={b.status}
                      onChange={e => { updateBriefStatus(b.id, e.target.value); load() }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => openEdit(b)}>수정</button>
                    <button className="btn btn-danger" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => { if (confirm('삭제할까요?')) { deleteBrief(b.id); load() } }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '기획서 수정' : '기획서 추가'}</h2>
            <div className="fg">
              <label>제목 *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="기획서 제목" />
            </div>
            <div className="fg">
              <label>설명</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="간략한 설명" />
            </div>
            <div className="fg">
              <label>배정 디자이너</label>
              <select value={form.designerId} onChange={e => setForm(p => ({ ...p, designerId: e.target.value }))}>
                <option value="">미배정</option>
                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>마감일</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save}>{editId ? '저장' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
