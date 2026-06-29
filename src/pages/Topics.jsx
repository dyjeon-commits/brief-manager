import React, { useState, useEffect } from 'react'
import { getAll, addTopic, updateTopic, deleteTopic, setTopicLabels } from '../api'

const TYPE_OPTIONS = [
  '프레젠테이션(1920x1080)', '프레젠테이션(1280x720)',
  '유튜브 썸네일', '카드뉴스', '인포그래픽', '기타',
]

const EMPTY = { name: '', briefUrl: '', type: '', type2: '', deadline: '', pages: '' }

export default function Topics() {
  const [topics, setTopics] = useState([])
  const [assignments, setAssignments] = useState([])
  const [labels, setLabels] = useState([])
  const [topicLabels, setTopicLabelsState] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selectedLabels, setSelectedLabels] = useState([])
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getAll()
    setTopics(data.topics || [])
    setAssignments(data.assignments || [])
    setLabels(data.labels || [])
    setTopicLabelsState(data.topicLabels || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setSelectedLabels([]); setEditId(null); setModal(true) }
  function openEdit(t) {
    setForm({ name: t.name, briefUrl: t.brief_url || '', type: t.type || '', type2: t.type2 || '', deadline: t.deadline || '', pages: t.pages || '' })
    const myLabels = topicLabels.filter(tl => tl.topic_id === t.id).map(tl => tl.label_id)
    setSelectedLabels(myLabels)
    setEditId(t.id); setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    let id = editId
    if (editId) await updateTopic({ id: editId, ...form })
    else {
      const result = await addTopic(form)
      id = result.id
    }
    await setTopicLabels(id, selectedLabels)
    setSaving(false); setModal(false); load()
  }

  async function remove(id) {
    const count = assignments.filter(a => String(a.topic_id) === String(id)).length
    const msg = count > 0 ? `이 주제는 ${count}개의 배정이 있습니다. 삭제하면 배정도 모두 삭제됩니다. 계속할까요?` : '삭제할까요?'
    if (!confirm(msg)) return
    await deleteTopic(id); load()
  }

  const countFor = id => assignments.filter(a => String(a.topic_id) === String(id)).length

  const getTopicLabelObjs = (id) => {
    const labelIds = topicLabels.filter(tl => tl.topic_id === id).map(tl => tl.label_id)
    return labels.filter(l => labelIds.includes(l.id))
  }

  function toggleLabel(id) {
    setSelectedLabels(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 16px', borderBottom: '1px solid var(--border)' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>작업주제 관리</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ 주제 추가</button>
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
        주제를 미리 등록해두면 배정 시 기획서 링크·마감일·페이지 수가 자동으로 채워집니다.
      </p>

      {topics.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📁</div>
          <p>등록된 작업주제가 없습니다.</p>
          <button className="btn btn-primary" onClick={openAdd}>첫 주제 추가하기</button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['주제명', '라벨', '타입', '기획서 링크', '마감일', '총 페이지', '배정 수', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {topics.map(t => {
                const labelObjs = getTopicLabelObjs(t.id)
                return (
                  <tr key={t.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{t.name}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {labelObjs.map(l => (
                          <span key={l.id} style={{ background: l.color + '22', color: l.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{l.name}</span>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {t.type && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t.type}</span>}
                      {t.type2 && <span style={{ background: '#fef9c3', color: '#b45309', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, marginLeft: 4 }}>{t.type2}</span>}
                    </td>
                    <td style={tdStyle}>
                      {t.brief_url
                        ? <a href={t.brief_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'underline' }}>링크 열기 →</a>
                        : <span style={{ color: 'var(--text2)', fontSize: 13 }}>-</span>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{t.deadline || '-'}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{t.pages ? `${t.pages}p` : '-'}</td>
                    <td style={tdStyle}>
                      <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{countFor(t.id)}명</span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => openEdit(t)}>수정</button>
                      <button className="btn btn-danger" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => remove(t.id)}>삭제</button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '작업주제 수정' : '작업주제 추가'}</h2>
            <div className="fg"><label>주제명 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="예: 2606_사업제안서" /></div>
            <div className="fg"><label>기획서 링크</label><input value={form.briefUrl} onChange={e => setForm(p => ({ ...p, briefUrl: e.target.value }))} placeholder="https://docs.google.com/..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg"><label>타입 및 사이즈</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="">선택</option>
                  {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="fg"><label>타입2 (베리)</label>
                <select value={form.type2} onChange={e => setForm(p => ({ ...p, type2: e.target.value }))}>
                  <option value="">없음</option>
                  {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg"><label>디자인 마감일</label><input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></div>
              <div className="fg"><label>총 제작 페이지</label><input type="number" value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} placeholder="예: 20" min="1" /></div>
            </div>
            {labels.length > 0 && (
              <div className="fg">
                <label>라벨 (이 주제에 맞는 디자이너 유형)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {labels.map(l => {
                    const on = selectedLabels.includes(l.id)
                    return (
                      <div key={l.id} onClick={() => toggleLabel(l.id)}
                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: on ? l.color : l.color + '22',
                          color: on ? 'white' : l.color,
                          border: `2px solid ${l.color}` }}>
                        {l.name}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중...' : editId ? '저장' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
