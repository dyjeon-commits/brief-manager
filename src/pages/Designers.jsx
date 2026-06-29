import React, { useState, useEffect } from 'react'
import { getAll, addDesigner, updateDesigner, deleteDesigner, setDesignerLabels, updateAssignmentStatus, deleteAssignment } from '../api'
import { useAuth } from '../AuthContext'

const EMPTY = { name: '', contact: '', specialty: '', note: '' }

export default function Designers() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'

  const [designers, setDesigners] = useState([])
  const [assignments, setAssignments] = useState([])
  const [topics, setTopics] = useState([])
  const [labels, setLabels] = useState([])
  const [designerLabels, setDesignerLabelsState] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selectedLabels, setSelectedLabels] = useState([])
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => { load() }, [profile])

  async function load() {
    setLoading(true)
    const data = await getAll(profile?.id, isSuperadmin)
    setDesigners(data.designers || [])
    setAssignments(data.assignments || [])
    setTopics(data.topics || [])
    setLabels(data.labels || [])
    setDesignerLabelsState(data.designerLabels || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setSelectedLabels([]); setEditId(null); setModal(true) }
  function openEdit(d) {
    setForm({ name: d.name, contact: d.contact || '', specialty: d.specialty || '', note: d.note || '' })
    const myLabels = designerLabels.filter(dl => dl.designer_id === d.id).map(dl => dl.label_id)
    setSelectedLabels(myLabels)
    setEditId(d.id); setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    let id = editId
    if (editId) await updateDesigner({ id: editId, ...form })
    else {
      const result = await addDesigner(form, profile?.id)
      id = result.id
    }
    await setDesignerLabels(id, selectedLabels)
    setSaving(false); setModal(false); load()
  }

  async function remove(id) {
    const count = assignments.filter(a => String(a.designer_id) === String(id)).length
    const msg = count > 0 ? `이 디자이너의 배정 ${count}건도 함께 삭제됩니다. 계속할까요?` : '삭제할까요?'
    if (!confirm(msg)) return
    await deleteDesigner(id); load()
  }

  const countFor = (id) => ({
    total:  assignments.filter(a => String(a.designer_id) === String(id)).length,
    active: assignments.filter(a => String(a.designer_id) === String(id) && a.status !== 'completed').length,
  })

  const getDesignerLabelObjs = (id) => {
    const labelIds = designerLabels.filter(dl => dl.designer_id === id).map(dl => dl.label_id)
    const childLabels = labels.filter(l => labelIds.includes(l.id) && l.parent_id)
    return childLabels.map(l => {
      const cat = labels.find(c => c.id === l.parent_id)
      return { ...l, catName: cat?.name || '', catColor: cat?.color || l.color }
    })
  }

  function toggleLabel(id) {
    setSelectedLabels(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>디자이너 관리</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ 디자이너 추가</button>
      </div>

      {designers.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">👤</div>
          <p>등록된 디자이너가 없습니다.</p>
          <button className="btn btn-primary" onClick={openAdd}>첫 디자이너 추가하기</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {designers.map(d => {
            const { total, active } = countFor(d.id)
            const labelObjs = getDesignerLabelObjs(d.id)
            return (
              <div key={d.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                    {d.name[0]}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openEdit(d)}>수정</button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => remove(d.id)}>삭제</button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{d.name}</div>
                {d.specialty && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, marginBottom: 4 }}>{d.specialty}</div>}
                {d.contact && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {d.contact}</div>}
                {d.token && (
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/view/${d.token}`); alert('링크가 복사되었습니다!') }}
                    style={{ marginTop: 8, background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#475569', width: '100%', textAlign: 'left' }}>
                    🔗 전용 링크 복사
                  </button>
                )}
                {labelObjs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {labelObjs.map(l => (
                      <span key={l.id} style={{ background: l.catColor + '22', color: l.catColor, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {l.catName} · {l.name}
                      </span>
                    ))}
                  </div>
                )}
                {d.note && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>{d.note}</div>}
                <div onClick={() => setDetailId(d.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                  <span>전체 {total}건</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>진행중 {active}건 →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailId && (() => {
        const d = designers.find(x => x.id === detailId)
        const myAssignments = assignments.filter(a => String(a.designer_id) === String(detailId))
        const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))
        const STATUS_LABELS = { not_submitted: '제출 안함', assigned: '제출 안함', inprogress: '진행 중', revision1: '1차 수정', revising: '수정 중', completed: '완료' }
        const STATUS_COLORS = { not_submitted: '#94a3b8', assigned: '#94a3b8', inprogress: '#3b82f6', revision1: '#f59e0b', revising: '#8b5cf6', completed: '#10b981' }
        return (
          <div className="overlay" onClick={() => setDetailId(null)}>
            <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
              <h2>{d?.name} 배정 현황</h2>
              {myAssignments.length === 0 ? (
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>배정된 주제가 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {myAssignments.map(a => {
                    const t = topicMap[String(a.topic_id)]
                    const status = a.status || 'not_submitted'
                    const color = STATUS_COLORS[status] || '#94a3b8'
                    return (
                      <div key={a.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{t?.name || '-'}</span>
                          <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {STATUS_LABELS[status] || status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                          {t?.deadline && <span>📅 {t.deadline}</span>}
                          {t?.pages && <span>{t.pages}p</span>}
                          {t?.brief_url && <a href={t.brief_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>기획서 열기 →</a>}
                        </div>
                        <select value={status}
                          onChange={async e => { await updateAssignmentStatus(a.id, e.target.value); load() }}
                          style={{ padding: '4px 8px', border: `1.5px solid ${color}`, borderRadius: 6, background: color + '11', color, fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                          {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'assigned').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="ma">
                <button className="btn btn-ghost" onClick={() => setDetailId(null)}>닫기</button>
              </div>
            </div>
          </div>
        )
      })()}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '디자이너 수정' : '디자이너 추가'}</h2>
            {[
              { label: '이름 *', key: 'name', placeholder: '홍길동' },
              { label: '연락처', key: 'contact', placeholder: '010-0000-0000 또는 이메일' },
              { label: '전문분야', key: 'specialty', placeholder: 'UX/UI, 그래픽, 영상 등' },
            ].map(f => (
              <div key={f.key} className="fg">
                <label>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            {labels.filter(l => !l.parent_id).length > 0 && (
              <div className="fg">
                <label>라벨</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {labels.filter(l => !l.parent_id).map(cat => {
                    const children = labels.filter(l => l.parent_id === cat.id)
                    if (children.length === 0) return null
                    return (
                      <div key={cat.id}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{cat.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {children.map(l => {
                            const on = selectedLabels.includes(l.id)
                            return (
                              <div key={l.id} onClick={() => toggleLabel(l.id)}
                                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                  background: on ? cat.color : cat.color + '22',
                                  color: on ? 'white' : cat.color,
                                  border: `2px solid ${cat.color}` }}>
                                {l.name}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="fg">
              <label>메모</label>
              <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="참고사항" />
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? '저장 중...' : editId ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
