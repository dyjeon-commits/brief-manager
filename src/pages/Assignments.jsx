import React, { useState, useEffect } from 'react'
import { getAll, addAssignment, deleteAssignment, updateAssignmentStatus } from '../api'

const STATUS_OPTIONS = [
  { value: 'assigned',   label: '배정됨' },
  { value: 'inprogress', label: '작업중' },
  { value: 'completed',  label: '완료' },
]

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [designers, setDesigners] = useState([])
  const [topics, setTopics] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ designerId: '', topicIds: [] })
  const [filterDesigner, setFilterDesigner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getAll()
    setAssignments(data.assignments || [])
    setDesigners(data.designers || [])
    setTopics(data.topics || [])
    setLoading(false)
  }

  const designerMap = Object.fromEntries(designers.map(d => [String(d.id), d]))
  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))

  const assignedTopicIds = form.designerId
    ? assignments.filter(a => String(a.designer_id) === String(form.designerId)).map(a => String(a.topic_id))
    : []

  function toggleTopic(id) {
    setForm(p => ({
      ...p,
      topicIds: p.topicIds.includes(id) ? p.topicIds.filter(x => x !== id) : [...p.topicIds, id]
    }))
  }

  async function save() {
    if (!form.designerId || form.topicIds.length === 0) return
    setSaving(true)
    for (const topicId of form.topicIds) {
      if (!assignedTopicIds.includes(String(topicId))) {
        await addAssignment({ designerId: Number(form.designerId), topicId: Number(topicId) })
      }
    }
    setSaving(false); setModal(false); setForm({ designerId: '', topicIds: [] }); load()
  }

  const filtered = assignments.filter(a => {
    if (filterDesigner !== 'all' && String(a.designer_id) !== String(filterDesigner)) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    return true
  })

  const isOverdue = a => {
    const t = topicMap[String(a.topic_id)]
    return t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
  }

  const tdStyle = { padding: '11px 16px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 13 }
  const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>배정 현황</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ designerId: '', topicIds: [] }); setModal(true) }}>+ 배정 추가</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 13 }}
          value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)}>
          <option value="all">전체 디자이너</option>
          {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ value: 'all', label: '전체' }, ...STATUS_OPTIONS].map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: filterStatus === s.value ? 'var(--accent-bg)' : 'transparent',
                color: filterStatus === s.value ? 'var(--accent)' : 'var(--text2)',
                border: filterStatus === s.value ? '1.5px solid var(--accent)' : '1.5px solid transparent' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📋</div>
          <p>배정 내역이 없습니다.</p>
          {topics.length === 0
            ? <p style={{ fontSize: 13 }}>먼저 작업주제를 등록해주세요.</p>
            : <button className="btn btn-primary" onClick={() => { setForm({ designerId: '', topicIds: [] }); setModal(true) }}>배정 추가하기</button>}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['디자이너', '작업주제', '타입', '기획서', '마감일', '총 페이지', '상태', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const t = topicMap[String(a.topic_id)]
                const d = designerMap[String(a.designer_id)]
                const overdue = isOverdue(a)
                return (
                  <tr key={a.id} style={{ background: overdue ? '#fff5f5' : undefined }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {d?.name?.[0] || '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{d?.name || '알 수 없음'}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{t?.name || '-'}</td>
                    <td style={tdStyle}>{t?.type && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{t.type}</span>}</td>
                    <td style={tdStyle}>{t?.brief_url ? <a href={t.brief_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>열기 →</a> : '-'}</td>
                    <td style={{ ...tdStyle, color: overdue ? 'var(--danger)' : undefined }}>
                      {t?.deadline || '-'}
                      {overdue && <span style={{ marginLeft: 6, fontSize: 11, background: '#fee2e2', color: 'var(--danger)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>초과</span>}
                    </td>
                    <td style={tdStyle}>{t?.pages ? `${t.pages}p` : '-'}</td>
                    <td style={tdStyle}>
                      <select style={{ padding: '5px 8px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--surface)', fontSize: 12, cursor: 'pointer' }}
                        value={a.status} onChange={async e => { await updateAssignmentStatus(a.id, e.target.value); load() }}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={async () => { if (confirm('배정을 삭제할까요?')) { await deleteAssignment(a.id); load() } }}>삭제</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <h2>배정 추가</h2>
            <div className="fg">
              <label>디자이너 선택 *</label>
              <select value={form.designerId} onChange={e => setForm(p => ({ ...p, designerId: e.target.value, topicIds: [] }))}>
                <option value="">디자이너를 선택하세요</option>
                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>작업주제 선택 * (복수 선택 가능)</label>
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                {topics.map(t => {
                  const alreadyAssigned = assignedTopicIds.includes(String(t.id))
                  const selected = form.topicIds.includes(String(t.id))
                  return (
                    <div key={t.id} onClick={() => !alreadyAssigned && toggleTopic(String(t.id))}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        cursor: alreadyAssigned ? 'not-allowed' : 'pointer',
                        background: selected ? 'var(--accent-bg)' : alreadyAssigned ? '#f9fafb' : 'white',
                        opacity: alreadyAssigned ? 0.5 : 1, userSelect: 'none' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: selected ? 'none' : '1.5px solid var(--border)', background: selected ? 'var(--accent)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                          {[t.deadline && `마감 ${t.deadline}`, t.pages && `${t.pages}p`].filter(Boolean).join(' · ')}
                          {alreadyAssigned && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>· 이미 배정됨</span>}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>{assignments.filter(a => String(a.topic_id) === String(t.id)).length}명</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>배정됨</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save}
                disabled={!form.designerId || form.topicIds.length === 0 || saving}
                style={{ opacity: (!form.designerId || form.topicIds.length === 0) ? 0.5 : 1 }}>
                {saving ? '배정 중...' : form.topicIds.length > 0 ? `${form.topicIds.length}개 배정` : '배정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
