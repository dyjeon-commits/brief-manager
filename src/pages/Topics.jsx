import React, { useState, useEffect } from 'react'
import { getAll, addTopic, updateTopic, deleteTopic, setTopicLabels, getTemplateAssignments, setTemplateAssignments } from '../api'
import { useAuth } from '../AuthContext'

const TYPE_OPTIONS = [
  '프레젠테이션(1920x1080)', '프레젠테이션(1280x720)',
  '유튜브 썸네일', '카드뉴스', '인포그래픽', '기타',
]

const EMPTY = { name: '', briefUrl: '', type: '', type2: '', deadline: '', pages: '', notice: '' }

export default function Topics() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'

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
  const [checkedIds, setCheckedIds] = useState([])
  const [designers, setDesigners] = useState([])
  const [designerLabels, setDesignerLabels] = useState([])
  // 템플릿 배분 모달
  const [tmplModal, setTmplModal] = useState(false)
  const [tmplTopic, setTmplTopic] = useState(null)
  const [tmplCount, setTmplCount] = useState('')
  const [tmplResult, setTmplResult] = useState([]) // [{templateIdx, designerId}]
  const [tmplSaving, setTmplSaving] = useState(false)

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    const data = await getAll(profile?.id, isSuperadmin)
    setTopics(data.topics || [])
    setAssignments(data.assignments || [])
    setLabels(data.labels || [])
    setTopicLabelsState(data.topicLabels || [])
    setDesigners(data.designers || [])
    setDesignerLabels(data.designerLabels || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setSelectedLabels([]); setEditId(null); setModal(true) }
  function openEdit(t) {
    setForm({ name: t.name, briefUrl: t.brief_url || '', type: t.type || '', type2: t.type2 || '', deadline: t.deadline || '', pages: t.pages || '', notice: t.notice || '' })
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
      const result = await addTopic(form, profile?.id)
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

  async function removeChecked() {
    const totalAssignments = checkedIds.reduce((acc, id) => acc + assignments.filter(a => String(a.topic_id) === String(id)).length, 0)
    const msg = totalAssignments > 0
      ? `선택한 ${checkedIds.length}개 주제 (배정 ${totalAssignments}건 포함)를 삭제할까요?`
      : `선택한 ${checkedIds.length}개 주제를 삭제할까요?`
    if (!confirm(msg)) return
    for (const id of checkedIds) await deleteTopic(id)
    setCheckedIds([]); load()
  }

  function toggleCheck(id) {
    setCheckedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }
  function toggleAll() {
    setCheckedIds(checkedIds.length === topics.length ? [] : topics.map(t => t.id))
  }

  const countFor = id => assignments.filter(a => String(a.topic_id) === String(id)).length

  // 템플릿 배분
  async function openTmplModal(topic) {
    setTmplTopic(topic)
    setTmplCount('')
    const existing = await getTemplateAssignments(topic.id)
    if (existing.length > 0) {
      setTmplResult(existing.map(e => ({ templateIdx: e.template_idx, designerId: e.designer_id })))
      setTmplCount(existing.length)
    } else {
      setTmplResult([])
    }
    setTmplModal(true)
  }

  function getDesignerLabelIds(did) {
    return designerLabels.filter(dl => String(dl.designer_id) === String(did)).map(dl => dl.label_id)
  }

  function getDesignerGrade(did) {
    const dLabelIds = getDesignerLabelIds(did)
    const dLabels = labels.filter(l => dLabelIds.includes(l.id) && l.parent_id)
    const names = dLabels.map(l => l.name.trim().toUpperCase())
    if (names.includes('A')) return 1
    if (names.includes('B')) return 2
    if (names.includes('C')) return 3
    if (dLabels.length > 0) return 10
    return 99
  }

  const sortedDesigners = [...designers].sort((a, b) => getDesignerGrade(a.id) - getDesignerGrade(b.id))

  function runTmplAuto() {
    const n = parseInt(tmplCount)
    if (!n || n < 1) return
    const m = sortedDesigners.length
    if (m === 0) return

    const base = Math.floor(n / m)
    const remainder = n % m

    // A등급 디자이너
    const aGraders = sortedDesigners.filter(d => getDesignerGrade(d.id) === 1)
    const orderedForRemainder = aGraders.length > 0
      ? [...aGraders, ...sortedDesigners.filter(d => getDesignerGrade(d.id) !== 1)]
      : sortedDesigners

    // 각 디자이너에게 배정할 수
    const counts = {}
    sortedDesigners.forEach(d => { counts[d.id] = base })
    for (let i = 0; i < remainder; i++) {
      counts[orderedForRemainder[i % orderedForRemainder.length].id]++
    }

    // 템플릿 idx 배분 (등급순)
    const result = []
    let idx = 1
    for (const d of sortedDesigners) {
      for (let i = 0; i < counts[d.id]; i++) {
        result.push({ templateIdx: idx++, designerId: d.id })
      }
    }
    setTmplResult(result)
  }

  async function saveTmplAssignments() {
    if (!tmplTopic || tmplResult.length === 0) return
    setTmplSaving(true)
    await setTemplateAssignments(tmplTopic.id, tmplResult)
    setTmplSaving(false)
    setTmplModal(false)
  }

  const getTopicLabelObjs = (id) => {
    const labelIds = topicLabels.filter(tl => tl.topic_id === id).map(tl => tl.label_id)
    return labels.filter(l => labelIds.includes(l.id))
  }

  function toggleLabel(id) {
    setSelectedLabels(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const [csvModal, setCsvModal] = useState(false)
  const [csvPreview, setCsvPreview] = useState([])
  const [csvSelected, setCsvSelected] = useState([])
  const [csvImporting, setCsvImporting] = useState(false)

  function handleCsvFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const rows = text.split('\n').map(r => {
        // CSV 파싱 (따옴표 처리)
        const cols = []
        let cur = '', inQ = false
        for (let i = 0; i < r.length; i++) {
          if (r[i] === '"') { inQ = !inQ }
          else if (r[i] === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
          else cur += r[i]
        }
        cols.push(cur.trim())
        return cols
      })
      // 헤더 제외, F(5), T(19), D(3) 컬럼
      const preview = rows.slice(1).filter(r => r[5]?.trim()).map(r => ({
        name: r[5]?.replace(/^"|"$/g, '').trim() || '',
        briefUrl: r[19]?.replace(/^"|"$/g, '').trim() || '',
        pages: r[3]?.replace(/^"|"$/g, '').trim() || '',
        type: '프레젠테이션(1920x1080)',
      })).filter(r => r.name)
      setCsvPreview(preview)
      setCsvSelected(preview.map((_, i) => i))
      setCsvModal(true)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function importCsv() {
    setCsvImporting(true)
    for (const i of csvSelected) {
      await addTopic(csvPreview[i], profile?.id)
    }
    setCsvImporting(false); setCsvModal(false); setCsvPreview([]); setCsvSelected([]); load()
  }

  const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 16px', borderBottom: '1px solid var(--border)' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>작업주제 관리</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {checkedIds.length > 0 && (
            <button className="btn btn-danger" onClick={removeChecked}>
              🗑 {checkedIds.length}개 삭제
            </button>
          )}
          <label style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
            📂 CSV 가져오기
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
          </label>
          <button className="btn btn-primary" onClick={openAdd}>+ 주제 추가</button>
        </div>
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
              <tr>
                <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={topics.length > 0 && checkedIds.length === topics.length} onChange={toggleAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                </th>
                {['주제명', '라벨', '타입', '기획서 링크', '마감일', '총 페이지', '배정 수', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {topics.map(t => {
                const labelObjs = getTopicLabelObjs(t.id)
                const isChecked = checkedIds.includes(t.id)
                return (
                  <tr key={t.id} style={{ background: isChecked ? 'var(--accent-bg)' : undefined }}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(t.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                    </td>
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
                      <button className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }} onClick={() => openTmplModal(t)}>📦 템플릿</button>
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

      {csvModal && (
        <div className="overlay" onClick={() => setCsvModal(false)}>
          <div className="modal" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
            <h2>CSV 가져오기</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>총 <strong>{csvPreview.length}개</strong> 인식 · <strong style={{ color: 'var(--accent)' }}>{csvSelected.length}개</strong> 선택됨</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setCsvSelected(csvPreview.map((_, i) => i))}>전체 선택</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => setCsvSelected([])}>전체 해제</button>
              </div>
            </div>
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 380, overflowY: 'auto', marginBottom: 16 }}>
              {csvPreview.map((r, i) => {
                const on = csvSelected.includes(i)
                return (
                  <div key={i} onClick={() => setCsvSelected(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', background: on ? 'var(--accent-bg)' : 'white', userSelect: 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: on ? 'none' : '1.5px solid var(--border)', background: on ? 'var(--accent)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                        {r.pages ? `${r.pages}p` : '페이지 없음'} · {r.briefUrl ? <span style={{ color: 'var(--accent)' }}>기획서 링크 있음</span> : '링크 없음'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setCsvModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={importCsv}
                disabled={csvImporting || csvSelected.length === 0}
                style={{ opacity: csvSelected.length === 0 ? 0.5 : 1 }}>
                {csvImporting ? '가져오는 중...' : `${csvSelected.length}개 가져오기`}
              </button>
            </div>
          </div>
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
            {labels.filter(l => !l.parent_id).length > 0 && (
              <div className="fg">
                <label>라벨 (이 주제에 맞는 디자이너 유형)</label>
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
              <label>주제 공지사항</label>
              <textarea value={form.notice} onChange={e => setForm(p => ({ ...p, notice: e.target.value }))}
                placeholder="외주에게 전달할 주제별 공지나 가이드를 입력하세요."
                style={{ width: '100%', minHeight: 80, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중...' : editId ? '저장' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
      {tmplModal && tmplTopic && (
        <div className="overlay" onClick={() => setTmplModal(false)}>
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <h2>📦 템플릿 배분 — {tmplTopic.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              CSV 업로드로 닉네임 매칭 배분하거나, 수동으로 수량을 입력해 균등 배분할 수 있습니다.
            </p>

            {/* CSV 업로드 */}
            <div style={{ background: '#f8fafc', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>📂 CSV로 닉네임 매칭 배분</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                컬럼 형식: <code style={{ background: '#e2e8f0', borderRadius: 4, padding: '1px 5px' }}>가설, 템플릿 idx, 디자인허브 닉네임, ...</code><br/>
                CSV의 모든 행을 읽어 닉네임으로 매칭합니다. 가설 컬럼은 무시됩니다.
              </div>
              <input type="file" accept=".csv" style={{ display: 'none' }} id="csv-upload"
                onChange={e => {
                  const file = e.target.files[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean)
                    if (lines.length < 2) return
                    // 헤더 건너뛰고 파싱
                    const rows = lines.slice(1).map(l => {
                      const cols = l.split(',')
                      return { idx: parseInt(cols[1]?.trim()), nickname: cols[2]?.trim() }
                    }).filter(r => !isNaN(r.idx))

                    if (rows.length === 0) {
                      alert('유효한 행이 없습니다. 컬럼 순서를 확인해주세요.')
                      e.target.value = ''
                      return
                    }

                    // 닉네임 → 디자이너 매핑
                    const nicknameMap = {}
                    sortedDesigners.forEach(d => { if (d.nickname) nicknameMap[d.nickname.trim()] = d.id })

                    const result = []
                    const unmatched = []
                    rows.forEach(r => {
                      const did = r.nickname ? nicknameMap[r.nickname] : null
                      if (did) result.push({ templateIdx: r.idx, designerId: did })
                      else unmatched.push(r.idx)
                    })

                    // 매칭 안 된 건 라운드로빈으로 분배
                    unmatched.forEach((idx, i) => {
                      result.push({ templateIdx: idx, designerId: sortedDesigners[i % sortedDesigners.length].id })
                    })

                    result.sort((a, b) => a.templateIdx - b.templateIdx)
                    setTmplResult(result)
                    setTmplCount(result.length)
                    if (unmatched.length > 0) alert(`매칭 완료! 닉네임 불일치 ${unmatched.length}건(idx: ${unmatched.slice(0,5).join(', ')}${unmatched.length > 5 ? '...' : ''})은 랜덤 배분했습니다.`)
                    e.target.value = ''
                  }
                  reader.readAsText(file, 'utf-8')
                }}
              />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#475569', border: '2px dashed #94a3b8', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700 }}>
                📂 CSV 파일 선택
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
              <div className="fg" style={{ flex: 1, margin: 0 }}>
                <label>총 템플릿 수 (수동 균등 배분)</label>
                <input type="number" min={1} value={tmplCount}
                  onChange={e => setTmplCount(e.target.value)}
                  placeholder="예: 30" style={{ width: '100%' }} />
              </div>
              <button className="btn btn-primary" onClick={runTmplAuto} disabled={!tmplCount || parseInt(tmplCount) < 1}>
                자동 배분
              </button>
            </div>

            {tmplResult.length > 0 && (() => {
              // 디자이너별 그룹핑
              const grouped = {}
              sortedDesigners.forEach(d => { grouped[d.id] = [] })
              tmplResult.forEach(r => { if (grouped[r.designerId]) grouped[r.designerId].push(r.templateIdx) })

              function adjustCount(designerId, delta) {
                const counts = {}
                sortedDesigners.forEach(d => { counts[d.id] = (grouped[d.id] || []).length })
                const next = (counts[designerId] || 0) + delta
                if (next < 0) return
                counts[designerId] = next
                const result = []; let idx = 1
                for (const d of sortedDesigners) {
                  for (let i = 0; i < counts[d.id]; i++) result.push({ templateIdx: idx++, designerId: d.id })
                }
                setTmplResult(result)
              }

              return (
                <>
                  <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 360, overflowY: 'auto', marginBottom: 14 }}>
                    {sortedDesigners.map(d => {
                      const idxList = grouped[d.id] || []
                      const dLabelIds = designerLabels.filter(dl => String(dl.designer_id) === String(d.id)).map(dl => dl.label_id)
                      const dLabels = labels.filter(l => dLabelIds.includes(l.id))
                      return (
                        <div key={d.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: idxList.length > 0 ? 8 : 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{d.name[0]}</div>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</span>
                            {d.nickname && <span style={{ fontSize: 11, color: 'var(--text2)' }}>({d.nickname})</span>}
                            {dLabels.map(l => <span key={l.id} style={{ background: l.color + '22', color: l.color, padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{l.name}</span>)}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button onClick={() => adjustCount(d.id, -1)} style={{ width: 24, height: 24, border: '1.5px solid var(--border)', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>−</button>
                              <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{idxList.length}개</span>
                              <button onClick={() => adjustCount(d.id, +1)} style={{ width: 24, height: 24, border: '1.5px solid var(--border)', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>+</button>
                            </div>
                          </div>
                          {idxList.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {idxList.map(idx => (
                                <span key={idx} style={{ background: '#f1f5f9', borderRadius: 5, padding: '2px 7px', fontSize: 12, color: 'var(--text2)' }}>#{idx}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {(() => {
                    const target = parseInt(tmplCount) || 0
                    const current = tmplResult.length
                    const diff = target - current
                    if (diff > 0) {
                      const avg = current / sortedDesigners.length
                      const belowAvg = sortedDesigners.filter(d => (grouped[d.id] || []).length < Math.ceil(avg))
                      return (
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#9a3412' }}>
                          ⚠️ <strong>{diff}개 부족</strong> — 아래 외주 중 <strong>{diff}명</strong>에게 배정이 필요합니다:&nbsp;
                          <strong>{belowAvg.length > 0 ? belowAvg.map(d => d.name).join(', ') : sortedDesigners.map(d => d.name).join(', ')}</strong>
                        </div>
                      )
                    }
                    if (diff < 0) {
                      return (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
                          ⚠️ <strong>{Math.abs(diff)}개 초과</strong> — 입력한 수보다 많습니다. 일부를 줄여주세요.
                        </div>
                      )
                    }
                    return (
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 13, color: '#166534' }}>
                        ✅ 총 <strong>{current}개</strong> 정확히 배분됨 · 외주 1인 평균 <strong>{(current / sortedDesigners.length).toFixed(1)}개</strong>
                      </div>
                    )
                  })()}
                </>
              )
            })()}

            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setTmplModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={saveTmplAssignments} disabled={tmplResult.length === 0 || tmplSaving}>
                {tmplSaving ? '저장 중...' : '배분 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
