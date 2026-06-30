import React, { useState, useEffect, useCallback } from 'react'

function RenderContent({ text }) {
  const parts = text.split(/(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g)
  const result = []
  let i = 0
  while (i < parts.length) {
    if (/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.test(parts[i])) {
      const m = parts[i].match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
      result.push(<a key={i} href={m[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>{m[1]}</a>)
      i += 3
    } else {
      if (parts[i]) result.push(parts[i])
      i++
    }
  }
  return <>{result}</>
}

function NoticeAccordion({ n, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 8px' }}
            onClick={e => { e.stopPropagation(); onEdit(n) }}>수정</button>
          <button className="btn btn-danger" style={{ fontSize: 12, padding: '3px 8px' }}
            onClick={e => { e.stopPropagation(); onDelete(n.id) }}>삭제</button>
          <span style={{ fontSize: 16, color: 'var(--text2)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
        </div>
      </div>
      {open && n.content && (
        <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6, borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 10 }}><RenderContent text={n.content} /></div>
        </div>
      )}
    </div>
  )
}
import { getAll, getNotices, addNotice, updateNotice, deleteNotice } from '../api'
import { useAuth } from '../AuthContext'
import { supabase } from '../AuthContext'

export default function Dashboard({ onNavigate }) {
  const { profile } = useAuth()
  const [data, setData] = useState({ designers: [], topics: [], assignments: [] })
  const [notices, setNotices] = useState([])
  const [templateAssignments, setTemplateAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [noticeModal, setNoticeModal] = useState(false)
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' })
  const [linkForm, setLinkForm] = useState({ text: '', url: '' })
  const [showLinkForm, setShowLinkForm] = useState(false)
  const contentRef = React.useRef(null)
  const [editNoticeId, setEditNoticeId] = useState(null)
  const [savingNotice, setSavingNotice] = useState(false)

  const isSuperadmin = profile?.role === 'superadmin'

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    const [d, n] = await Promise.all([
      getAll(profile?.id, isSuperadmin),
      getNotices(profile?.id),
    ])
    setData(d)
    setNotices(n)

    // fetch template_assignments for workload calc
    if (d.designers?.length > 0) {
      const { data: tmpl } = await supabase.from('template_assignments').select('*')
        .in('designer_id', d.designers.map(x => x.id))
      setTemplateAssignments(tmpl || [])
    }

    setLoading(false)
  }

  async function saveNotice() {
    if (!noticeForm.title.trim()) return
    setSavingNotice(true)
    if (editNoticeId) await updateNotice(editNoticeId, noticeForm.title, noticeForm.content)
    else await addNotice(noticeForm.title, noticeForm.content, profile?.id)
    setSavingNotice(false)
    setNoticeModal(false)
    setNoticeForm({ title: '', content: '' })
    setEditNoticeId(null)
    setNotices(await getNotices(profile?.id))
  }

  function openAddNotice() {
    setNoticeForm({ title: '', content: '' })
    setEditNoticeId(null); setShowLinkForm(false); setLinkForm({ text: '', url: '' })
    setNoticeModal(true)
  }

  function openEditNotice(n) {
    setNoticeForm({ title: n.title, content: n.content || '' })
    setEditNoticeId(n.id); setShowLinkForm(false); setLinkForm({ text: '', url: '' })
    setNoticeModal(true)
  }

  function insertLink() {
    if (!linkForm.text.trim() || !linkForm.url.trim()) return
    const tag = `[${linkForm.text.trim()}](${linkForm.url.trim()})`
    const el = contentRef.current
    if (el) {
      const start = el.selectionStart
      const before = noticeForm.content.slice(0, start)
      const after = noticeForm.content.slice(start)
      setNoticeForm(p => ({ ...p, content: before + tag + after }))
    } else {
      setNoticeForm(p => ({ ...p, content: p.content + (p.content ? '\n' : '') + tag }))
    }
    setLinkForm({ text: '', url: '' }); setShowLinkForm(false)
  }

  async function removeNotice(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await deleteNotice(id)
    setNotices(await getNotices(profile?.id))
  }

  const { designers, topics, assignments, labels = [], designerLabels = [] } = data
  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))

  const totalTemplates = assignments.reduce((sum, a) => {
    const t = topicMap[String(a.topic_id)]
    const tmplCount = templateAssignments.filter(ta => String(ta.designer_id) === String(a.designer_id) && String(ta.topic_id) === String(a.topic_id)).length
    return sum + (tmplCount > 0 ? tmplCount : (t?.qty_per_person || 1))
  }, 0)

  const stats = {
    total:      totalTemplates,
    inprogress: assignments.filter(a => a.status === 'inprogress').length,
    completed:  assignments.filter(a => a.status === 'completed').length,
    overdue:    assignments.filter(a => {
      const t = topicMap[String(a.topic_id)]
      return t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
    }).length,
  }

  const getDesignerGrade = (designerId) => {
    const dLabelIds = designerLabels.filter(dl => String(dl.designer_id) === String(designerId)).map(dl => dl.label_id)
    const dLabels = labels.filter(l => dLabelIds.includes(l.id) && l.parent_id)
    if (dLabels.length === 0) return 99
    const names = dLabels.map(l => l.name.trim().toUpperCase())
    if (names.includes('A')) return 1
    if (names.includes('B')) return 2
    if (names.includes('C')) return 3
    return 10
  }

  const byDesigner = designers.map(d => {
    const myAssignments = assignments.filter(a => String(a.designer_id) === String(d.id))
    const totalWork = myAssignments.reduce((sum, a) => {
      const t = topicMap[String(a.topic_id)]
      const tmplCount = templateAssignments.filter(ta => String(ta.designer_id) === String(d.id) && String(ta.topic_id) === String(a.topic_id)).length
      return sum + (tmplCount > 0 ? tmplCount : (t?.qty_per_person || 1))
    }, 0)
    return {
      ...d,
      total:      myAssignments.length,
      inprogress: myAssignments.filter(a => a.status !== 'completed').length,
      totalWork,
      grade:      getDesignerGrade(d.id),
    }
  }).sort((a, b) => a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'ko'))

  const byTopic = topics.map(t => {
    const count = assignments.filter(a => String(a.topic_id) === String(t.id)).length
    const tmplCount = templateAssignments.filter(ta => String(ta.topic_id) === String(t.id)).length
    const totalWork = tmplCount > 0 ? tmplCount : count * (t.qty_per_person || 1)
    return { ...t, count, totalWork, isTmpl: tmplCount > 0 }
  }).filter(t => t.count > 0).sort((a, b) => b.count - a.count)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text2)', fontSize: 15 }}>
      데이터 불러오는 중...
    </div>
  )

  return (
    <div>
      <div className="ph"><h1>대시보드</h1></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: '총 예상 템플릿 수', value: stats.total,      accent: '#6366f1' },
          { label: '진행중',    value: stats.inprogress, accent: '#3b82f6' },
          { label: '완료',      value: stats.completed,  accent: '#22c55e' },
          { label: '마감초과',  value: stats.overdue,    accent: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px', borderLeft: `4px solid ${s.accent}` }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 공지/가이드 관리 */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16, background: '#fffbeb', border: '1.5px solid #fde68a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 15 }}>📢 공지 / 가이드</strong>
          <button onClick={openAddNotice} style={{ fontSize: 13, padding: '6px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>+ 공지 추가</button>
        </div>
        {notices.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 13, padding: '12px 0' }}>
            등록된 공지가 없습니다. 외주 디자이너 링크에 표시할 공지를 추가해보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notices.map(n => <NoticeAccordion key={n.id} n={n} onEdit={openEditNotice} onDelete={removeNotice} />)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* 디자이너별 현황 */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <strong style={{ fontSize: 15 }}>디자이너별 현황</strong>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => onNavigate('assignments')}>배정 보기 →</button>
          </div>
          {byDesigner.length === 0
            ? <div className="empty"><div className="empty-icon">👤</div><p>디자이너를 먼저 등록해주세요</p></div>
            : byDesigner.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {d.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{d.specialty || ''}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ color: 'var(--text2)' }}>배정 주제 <strong style={{ color: 'var(--text)', fontSize: 13 }}>{d.total}개</strong></div>
                  <div style={{ color: 'var(--text2)', marginTop: 2 }}>총 템플릿 <strong style={{ color: 'var(--accent)', fontSize: 13 }}>{d.totalWork}개</strong></div>
                </div>
              </div>
            ))
          }
        </div>

        {/* 주제별 배정 현황 */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <strong style={{ fontSize: 15 }}>주제별 배정 현황</strong>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => onNavigate('topics')}>주제 관리 →</button>
          </div>
          {byTopic.length === 0
            ? <div className="empty"><div className="empty-icon">📁</div><p>배정된 주제가 없습니다</p></div>
            : byTopic.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {[t.deadline && `마감 ${t.deadline}`, t.pages && `${t.pages}p`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ color: 'var(--text2)' }}>배정 인원 <strong style={{ color: 'var(--text)', fontSize: 13 }}>{t.count}명</strong></div>
                  <div style={{ color: 'var(--text2)', marginTop: 2 }}>총 템플릿 <strong style={{ color: '#6366f1', fontSize: 13 }}>{t.totalWork}개</strong></div>
                </div>
              </div>
            ))
          }
        </div>

        {/* 마감일별 주제 현황 */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <strong style={{ fontSize: 15 }}>📅 마감일별 주제 현황</strong>
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0)
            const byDeadline = {}
            topics.filter(t => t.deadline).forEach(t => {
              if (!byDeadline[t.deadline]) byDeadline[t.deadline] = []
              byDeadline[t.deadline].push(t)
            })
            const sorted = Object.entries(byDeadline).sort((a, b) => new Date(a[0]) - new Date(b[0]))
            if (sorted.length === 0) return <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 12 }}>마감일이 설정된 주제가 없습니다.</div>
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                {sorted.map(([deadline, tList]) => {
                  const d = new Date(deadline); d.setHours(0,0,0,0)
                  const diff = Math.round((d - today) / (1000*60*60*24))
                  const isPast = diff < 0
                  const label = diff === 0 ? '오늘' : isPast ? `D+${Math.abs(diff)}` : `D-${diff}`
                  const color = isPast ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#6366f1'
                  return (
                    <div key={deadline} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 80, paddingTop: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color }}>{deadline}</div>
                        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>총 {tList.length}개</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {tList.map(t => (
                            <span key={t.id} style={{ background: color + '15', color, border: `1px solid ${color}33`, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {noticeModal && (
        <div className="overlay" onClick={() => setNoticeModal(false)}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <h2>{editNoticeId ? '공지 수정' : '공지 추가'}</h2>
            <div className="fg">
              <label>제목 *</label>
              <input value={noticeForm.title} onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))}
                placeholder="예: 작업 가이드, 제출 양식 안내" />
            </div>
            <div className="fg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>내용</label>
                <button type="button" onClick={() => setShowLinkForm(p => !p)}
                  style={{ fontSize: 12, padding: '3px 10px', background: 'var(--accent-bg)', color: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                  🔗 링크 삽입
                </button>
              </div>
              {showLinkForm && (
                <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '12px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={linkForm.text} onChange={e => setLinkForm(p => ({ ...p, text: e.target.value }))}
                    placeholder="표시할 텍스트 (예: 작업 가이드 바로가기)" style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                  <input value={linkForm.url} onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="URL (예: https://...)" style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={insertLink}
                      disabled={!linkForm.text.trim() || !linkForm.url.trim()}
                      style={{ flex: 1, padding: '6px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!linkForm.text.trim() || !linkForm.url.trim()) ? 0.5 : 1 }}>
                      삽입
                    </button>
                    <button type="button" onClick={() => setShowLinkForm(false)}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
              <textarea ref={contentRef} value={noticeForm.content} onChange={e => setNoticeForm(p => ({ ...p, content: e.target.value }))}
                placeholder="외주 디자이너에게 전달할 내용을 입력하세요." rows={5} />
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setNoticeModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={saveNotice} disabled={savingNotice || !noticeForm.title.trim()}>
                {savingNotice ? '저장 중...' : editNoticeId ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
