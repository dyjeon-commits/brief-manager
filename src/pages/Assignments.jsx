import React, { useState, useEffect, useRef } from 'react'
import { getAll, addAssignment, deleteAssignment, updateAssignmentStatus } from '../api'
import { useAuth } from '../AuthContext'

const STATUS_COLUMNS = [
  { value: 'not_submitted', label: '제출 안함', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 'inprogress',    label: '진행 중',   color: '#3b82f6', bg: '#eff6ff' },
  { value: 'revision1',     label: '1차 수정',  color: '#f59e0b', bg: '#fffbeb' },
  { value: 'revising',      label: '수정 중',   color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'completed',     label: '완료',      color: '#10b981', bg: '#f0fdf4' },
]

const STATUS_MAP = Object.fromEntries(STATUS_COLUMNS.map(s => [s.value, s]))

export default function Assignments() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'

  const [assignments, setAssignments] = useState([])
  const [designers, setDesigners] = useState([])
  const [topics, setTopics] = useState([])
  const [labels, setLabels] = useState([])
  const [designerLabels, setDesignerLabels] = useState([])
  const [topicLabels, setTopicLabels] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ designerId: '', topicIds: [] })
  const [filterDesigner, setFilterDesigner] = useState('all')
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [autoSuggestions, setAutoSuggestions] = useState([])
  const [selectedAuto, setSelectedAuto] = useState([])
  const [autoTopicId, setAutoTopicId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState('board')
  // 자동배분 wizard
  const [autoStep, setAutoStep] = useState(0) // 0=off, 1, 2, 3
  const [stepGrade, setStepGrade] = useState([])   // [{topic, selectedDesignerIds}]
  const [stepRandom, setStepRandom] = useState([]) // [{topic, selectedDesignerIds}]
  const [minCounts, setMinCounts] = useState({})   // {topicId: number}
  const dragId = useRef(null)

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    const data = await getAll(profile?.id, isSuperadmin)
    setAssignments(data.assignments || [])
    setDesigners(data.designers || [])
    setTopics(data.topics || [])
    setLabels(data.labels || [])
    setDesignerLabels(data.designerLabels || [])
    setTopicLabels(data.topicLabels || [])
    setLoading(false)
  }

  const designerMap = Object.fromEntries(designers.map(d => [String(d.id), d]))
  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))

  function getAutoSuggestedDesigners(topicId) {
    const tLabelIds = topicLabels.filter(tl => tl.topic_id === topicId).map(tl => tl.label_id)
    if (tLabelIds.length === 0) return []
    const alreadyAssigned = assignments.filter(a => String(a.topic_id) === String(topicId)).map(a => a.designer_id)
    return designers.filter(d => {
      if (alreadyAssigned.includes(d.id)) return false
      const dLabelIds = designerLabels.filter(dl => dl.designer_id === d.id).map(dl => dl.label_id)
      return dLabelIds.some(id => tLabelIds.includes(id))
    })
  }

  function openAutoModal(topicId) {
    const suggested = getAutoSuggestedDesigners(topicId)
    setAutoTopicId(topicId)
    setAutoSuggestions(suggested)
    setSelectedAuto(suggested.map(d => d.id))
    setShowAutoModal(true)
  }

  async function confirmAuto() {
    setSaving(true)
    for (const dId of selectedAuto) {
      await addAssignment({ designerId: dId, topicId: autoTopicId })
    }
    setSaving(false); setShowAutoModal(false); load()
  }

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
    return true
  })

  const isOverdue = a => {
    const t = topicMap[String(a.topic_id)]
    return t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
  }

  const getDesignerLabelObjs = (id) => {
    const lIds = designerLabels.filter(dl => dl.designer_id === id).map(dl => dl.label_id)
    return labels.filter(l => lIds.includes(l.id))
  }

  const autoTopics = topics.filter(t => getAutoSuggestedDesigners(t.id).length > 0)

  const getTopicLabelIds = tid => topicLabels.filter(tl => String(tl.topic_id) === String(tid)).map(tl => tl.label_id)
  const getDesignerLabelIds = did => designerLabels.filter(dl => String(dl.designer_id) === String(did)).map(dl => dl.label_id)

  function startWizard() {
    const assignedTopicIds = new Set(assignments.map(a => String(a.topic_id)))
    const unassigned = topics.filter(t => !assignedTopicIds.has(String(t.id)))

    // 1단계: 등급 매칭 (주제 라벨 ↔ 디자이너 라벨 교집합 있으면 전원 배정)
    const gradeRows = []
    const noMatchTopics = []
    for (const topic of unassigned) {
      const tLabelIds = getTopicLabelIds(topic.id)
      if (tLabelIds.length === 0) { noMatchTopics.push(topic); continue }
      const matched = designers.filter(d => getDesignerLabelIds(d.id).some(id => tLabelIds.includes(id)))
      if (matched.length === 0) { noMatchTopics.push(topic); continue }
      gradeRows.push({ topic, selectedDesignerIds: matched.map(d => d.id) })
    }

    // 2단계 초기값: 매칭 안된 주제들, 최소수량 기본 1
    const initMin = {}
    noMatchTopics.forEach(t => { initMin[t.id] = 1 })
    setMinCounts(initMin)
    setStepGrade(gradeRows)
    setStepRandom(noMatchTopics.map(t => ({ topic: t, selectedDesignerIds: [] })))
    setAutoStep(1)
  }

  function buildRandomStep() {
    // 2단계에서 "다음" 누를 때 랜덤 배분 계산
    const countMap = {} // designerId → 총 배정 수 (기존 + 1단계)
    designers.forEach(d => { countMap[d.id] = assignments.filter(a => String(a.designer_id) === String(d.id)).length })
    stepGrade.forEach(row => row.selectedDesignerIds.forEach(did => { countMap[did] = (countMap[did] || 0) + 1 }))

    const gradedMatchedIds = new Set(stepGrade.flatMap(r => r.selectedDesignerIds))
    const ungradedDesigners = designers.filter(d => getDesignerLabelIds(d.id).length === 0)
    const pool = ungradedDesigners.length > 0 ? ungradedDesigners : designers

    const newRandom = stepRandom.map(row => {
      const min = minCounts[row.topic.id] || 1
      const picked = []
      const sorted = [...pool].sort((a, b) => (countMap[a.id] || 0) - (countMap[b.id] || 0))
      for (let i = 0; i < Math.min(min, sorted.length); i++) {
        picked.push(sorted[i].id)
        countMap[sorted[i].id] = (countMap[sorted[i].id] || 0) + 1
      }
      return { ...row, selectedDesignerIds: picked }
    })
    setStepRandom(newRandom)
    setAutoStep(3)
  }

  async function confirmWizard() {
    setSaving(true)
    const all = [
      ...stepGrade.map(r => r.selectedDesignerIds.map(did => ({ designerId: did, topicId: r.topic.id }))).flat(),
      ...stepRandom.map(r => r.selectedDesignerIds.map(did => ({ designerId: did, topicId: r.topic.id }))).flat(),
    ]
    for (const { designerId, topicId } of all) {
      await addAssignment({ designerId, topicId })
    }
    setSaving(false); setAutoStep(0); load()
  }

  // 3단계: 디자이너별 배정 수 요약
  const wizardSummary = () => {
    const map = {}
    designers.forEach(d => { map[d.id] = [] })
    stepGrade.forEach(r => r.selectedDesignerIds.forEach(did => { if (map[did]) map[did].push(r.topic) }))
    stepRandom.forEach(r => r.selectedDesignerIds.forEach(did => { if (map[did]) map[did].push(r.topic) }))
    return designers.map(d => ({ designer: d, topics: map[d.id] || [] })).filter(x => x.topics.length > 0)
  }

  // drag and drop
  function onDragStart(e, assignmentId) {
    dragId.current = assignmentId
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function onDrop(e, newStatus) {
    e.preventDefault()
    if (!dragId.current) return
    const id = dragId.current
    dragId.current = null
    // optimistic update
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
    await updateAssignmentStatus(id, newStatus)
  }

  const tdStyle = { padding: '11px 16px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 13 }
  const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>배정 현황</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 표/보드 토글 */}
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {[{ id: 'table', icon: '☰', label: '표' }, { id: 'board', icon: '⊞', label: '보드' }].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: viewMode === v.id ? 'var(--accent)' : 'transparent',
                  color: viewMode === v.id ? 'white' : 'var(--text2)' }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={startWizard}>⚡ 전체 자동 배분</button>
          <button className="btn btn-primary" onClick={() => { setForm({ designerId: '', topicIds: [] }); setModal(true) }}>+ 배정 추가</button>
        </div>
      </div>

      {autoTopics.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1d4ed8', marginBottom: 10 }}>⚡ 자동배치 추천</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {autoTopics.map(t => {
              const cnt = getAutoSuggestedDesigners(t.id).length
              return (
                <button key={t.id} onClick={() => openAutoModal(t.id)}
                  style={{ background: 'white', border: '1.5px solid #3b82f6', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>
                  {t.name} <span style={{ background: '#3b82f6', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{cnt}명 매칭</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 디자이너 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 13 }}
          value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)}>
          <option value="all">전체 디자이너</option>
          {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📋</div>
          <p>배정 내역이 없습니다.</p>
          {topics.length === 0
            ? <p style={{ fontSize: 13 }}>먼저 작업주제를 등록해주세요.</p>
            : <button className="btn btn-primary" onClick={() => { setForm({ designerId: '', topicIds: [] }); setModal(true) }}>배정 추가하기</button>}
        </div>
      ) : viewMode === 'board' ? (
        /* ── 보드 뷰 ── */
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 16 }}>
          {STATUS_COLUMNS.map(col => {
            const norm = s => (!s || s === 'assigned') ? 'not_submitted' : s
            const cards = filtered.filter(a => norm(a.status) === col.value)
            return (
              <div key={col.value}
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, col.value)}
                style={{ minWidth: 240, width: 240, flexShrink: 0, background: col.bg, borderRadius: 12, padding: '14px 12px', minHeight: 200 }}>
                {/* 컬럼 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', background: col.color + '33', color: col.color, borderRadius: 20, padding: '1px 9px', fontSize: 12, fontWeight: 700 }}>{cards.length}</span>
                </div>
                {/* 카드 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cards.map(a => {
                    const t = topicMap[String(a.topic_id)]
                    const d = designerMap[String(a.designer_id)]
                    const overdue = isOverdue(a)
                    return (
                      <div key={a.id}
                        draggable
                        onDragStart={e => onDragStart(e, a.id)}
                        style={{ background: 'white', borderRadius: 10, padding: '12px 13px', cursor: 'grab', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: overdue ? '1.5px solid #fca5a5' : '1.5px solid transparent', userSelect: 'none' }}>
                        {/* 디자이너 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                            {d?.name?.[0] || '?'}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{d?.name || '?'}</span>
                          {overdue && <span style={{ marginLeft: 'auto', fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>마감초과</span>}
                        </div>
                        {/* 주제명 */}
                        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{t?.name || '-'}</div>
                        {/* 메타 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {t?.deadline && <span style={{ fontSize: 11, color: overdue ? '#dc2626' : 'var(--text2)' }}>📅 {t.deadline}</span>}
                          {t?.pages && <span style={{ fontSize: 11, color: 'var(--text2)' }}>· {t.pages}p</span>}
                        </div>
                        {t?.brief_url && (
                          <a href={t.brief_url} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'var(--accent)', textDecoration: 'underline' }}
                            onClick={e => e.stopPropagation()}>
                            기획서 열기 →
                          </a>
                        )}
                        {/* 삭제 */}
                        <button onClick={async () => { if (confirm('배정을 삭제할까요?')) { await deleteAssignment(a.id); load() } }}
                          style={{ display: 'block', marginTop: 10, width: '100%', padding: '4px', fontSize: 11, color: '#dc2626', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer' }}>
                          삭제
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── 표 뷰 ── */
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
                const statusInfo = STATUS_MAP[a.status] || STATUS_MAP['not_submitted']
                return (
                  <tr key={a.id} style={{ background: overdue ? '#fff5f5' : undefined }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {d?.name?.[0] || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{d?.name || '알 수 없음'}</div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                            {getDesignerLabelObjs(a.designer_id).map(l => (
                              <span key={l.id} style={{ background: l.color + '22', color: l.color, padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{l.name}</span>
                            ))}
                          </div>
                        </div>
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
                      <select style={{ padding: '5px 8px', border: `1.5px solid ${statusInfo.color}`, borderRadius: 7, background: statusInfo.bg, fontSize: 12, cursor: 'pointer', color: statusInfo.color, fontWeight: 600 }}
                        value={a.status || 'not_submitted'} onChange={async e => { await updateAssignmentStatus(a.id, e.target.value); load() }}>
                        {STATUS_COLUMNS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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

      {/* ── 자동배분 wizard ── */}
      {autoStep > 0 && (
        <div className="overlay" onClick={() => setAutoStep(0)}>
          <div className="modal" style={{ width: 620 }} onClick={e => e.stopPropagation()}>

            {/* 단계 표시 */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
              {['1단계 등급 매칭', '2단계 수량 설정', '3단계 최종 검토'].map((label, i) => {
                const step = i + 1
                const active = autoStep === step
                const done = autoStep > step
                return (
                  <div key={step} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderBottom: `3px solid ${active ? 'var(--accent)' : done ? '#22c55e' : 'var(--border)'}`,
                    fontSize: 12, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : done ? '#22c55e' : 'var(--text2)' }}>
                    {done ? '✓ ' : ''}{label}
                  </div>
                )
              })}
            </div>

            {/* 1단계: 등급 매칭 */}
            {autoStep === 1 && (
              <>
                <h2>1단계 — 등급 매칭</h2>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                  주제 등급과 같은 등급의 외주 전원이 배정됩니다. 제외할 외주는 체크 해제하세요.
                </p>
                <div style={{ maxHeight: 380, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                  {stepGrade.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>등급 매칭되는 주제가 없습니다.</div>
                  ) : stepGrade.map((row, ri) => {
                    const tLabelIds = getTopicLabelIds(row.topic.id)
                    const tLabelObjs = labels.filter(l => tLabelIds.includes(l.id))
                    return (
                      <div key={row.topic.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{row.topic.name}</span>
                          {tLabelObjs.map(l => <span key={l.id} style={{ background: l.color + '22', color: l.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{l.name}</span>)}
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text2)' }}>{row.selectedDesignerIds.length}명 배정</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {designers.filter(d => getDesignerLabelIds(d.id).some(id => tLabelIds.includes(id))).map(d => {
                            const on = row.selectedDesignerIds.includes(d.id)
                            const dLabels = labels.filter(l => getDesignerLabelIds(d.id).includes(l.id))
                            return (
                              <div key={d.id} onClick={() => setStepGrade(prev => prev.map((r, i) => i !== ri ? r : {
                                ...r, selectedDesignerIds: on ? r.selectedDesignerIds.filter(x => x !== d.id) : [...r.selectedDesignerIds, d.id]
                              }))}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', userSelect: 'none',
                                  border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-bg)' : 'white' }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{d.name[0]}</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                  <div style={{ display: 'flex', gap: 3 }}>{dLabels.map(l => <span key={l.id} style={{ background: l.color + '22', color: l.color, fontSize: 10, padding: '1px 5px', borderRadius: 20, fontWeight: 600 }}>{l.name}</span>)}</div>
                                </div>
                                {on && <span style={{ color: 'var(--accent)', fontSize: 14, marginLeft: 4 }}>✓</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {stepRandom.length > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
                    등급 미매칭 주제 <strong>{stepRandom.length}건</strong>은 다음 단계에서 수량 설정 후 랜덤 배분됩니다.
                  </p>
                )}
                <div className="ma">
                  <button className="btn btn-ghost" onClick={() => setAutoStep(0)}>취소</button>
                  <button className="btn btn-primary" onClick={() => setAutoStep(2)}>다음 →</button>
                </div>
              </>
            )}

            {/* 2단계: 수량 설정 */}
            {autoStep === 2 && (
              <>
                <h2>2단계 — 나머지 주제 수량 설정</h2>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                  등급 매칭이 없는 주제에 배정할 최소 외주 수를 설정하세요. 랜덤으로 배분됩니다.
                </p>
                {stepRandom.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                    모든 주제가 등급 매칭되었습니다.
                  </div>
                ) : (
                  <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    {stepRandom.map(row => (
                      <div key={row.topic.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{row.topic.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{row.topic.deadline && `마감 ${row.topic.deadline}`}{row.topic.pages && ` · ${row.topic.pages}p`}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, color: 'var(--text2)' }}>최소</span>
                          <input type="number" min={1} max={designers.length}
                            value={minCounts[row.topic.id] || 1}
                            onChange={e => setMinCounts(p => ({ ...p, [row.topic.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                            style={{ width: 60, padding: '5px 8px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 14, textAlign: 'center' }} />
                          <span style={{ fontSize: 13, color: 'var(--text2)' }}>명</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ma">
                  <button className="btn btn-ghost" onClick={() => setAutoStep(1)}>← 이전</button>
                  <button className="btn btn-primary" onClick={buildRandomStep}>다음 →</button>
                </div>
              </>
            )}

            {/* 3단계: 최종 검토 */}
            {autoStep === 3 && (() => {
              const summary = wizardSummary()
              return (
                <>
                  <h2>3단계 — 최종 검토</h2>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                    외주별 배정 현황입니다. 주제 옆 × 를 눌러 개별 조정할 수 있어요.
                  </p>
                  <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 380, overflowY: 'auto', marginBottom: 16 }}>
                    {summary.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>배정된 내역이 없습니다.</div>
                    ) : summary.map(({ designer: d, topics: dTopics }) => (
                      <div key={d.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{d.name[0]}</div>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</span>
                          <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}>{dTopics.length}건</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {dTopics.map(t => (
                            <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                              {t.name}
                              <button onClick={() => {
                                setStepGrade(prev => prev.map(r => ({ ...r, selectedDesignerIds: r.topic.id === t.id ? r.selectedDesignerIds.filter(x => x !== d.id) : r.selectedDesignerIds })))
                                setStepRandom(prev => prev.map(r => ({ ...r, selectedDesignerIds: r.topic.id === t.id ? r.selectedDesignerIds.filter(x => x !== d.id) : r.selectedDesignerIds })))
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
                    총 배정 <strong style={{ color: 'var(--text)' }}>{summary.reduce((s, x) => s + x.topics.length, 0)}건</strong> · 외주 <strong style={{ color: 'var(--text)' }}>{summary.length}명</strong>
                  </div>
                  <div className="ma">
                    <button className="btn btn-ghost" onClick={() => setAutoStep(2)}>← 이전</button>
                    <button className="btn btn-primary" onClick={confirmWizard} disabled={saving}>
                      {saving ? '배정 중...' : '배정 확정'}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {showAutoModal && (
        <div className="overlay" onClick={() => setShowAutoModal(false)}>
          <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <h2>⚡ 자동배치 확인</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              <strong style={{ color: '#111' }}>{topicMap[String(autoTopicId)]?.name}</strong> 주제의 라벨과 매칭된 디자이너입니다.<br/>
              배정할 디자이너를 선택해주세요.
            </p>
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              {autoSuggestions.map(d => {
                const on = selectedAuto.includes(d.id)
                const labelObjs = getDesignerLabelObjs(d.id)
                return (
                  <div key={d.id} onClick={() => setSelectedAuto(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', background: on ? 'var(--accent-bg)' : 'white', userSelect: 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: on ? 'none' : '1.5px solid var(--border)', background: on ? 'var(--accent)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {d.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {labelObjs.map(l => (
                          <span key={l.id} style={{ background: l.color + '22', color: l.color, padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{l.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setShowAutoModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={confirmAuto}
                disabled={selectedAuto.length === 0 || saving}
                style={{ opacity: selectedAuto.length === 0 ? 0.5 : 1 }}>
                {saving ? '배정 중...' : `${selectedAuto.length}명 배정 확정`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
