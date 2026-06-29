import React, { useState, useEffect } from 'react'
import { getAll, getNotices, addNotice, updateNotice, deleteNotice } from '../api'
import { useAuth } from '../AuthContext'

export default function Dashboard({ onNavigate }) {
  const { profile } = useAuth()
  const [data, setData] = useState({ designers: [], topics: [], assignments: [] })
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [noticeModal, setNoticeModal] = useState(false)
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' })
  const [editNoticeId, setEditNoticeId] = useState(null)
  const [savingNotice, setSavingNotice] = useState(false)

  const isSuperadmin = profile?.role === 'superadmin'

  useEffect(() => { load() }, [profile])

  async function load() {
    setLoading(true)
    const [d, n] = await Promise.all([
      getAll(profile?.id, isSuperadmin),
      getNotices(profile?.id),
    ])
    setData(d)
    setNotices(n)
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
    setEditNoticeId(null)
    setNoticeModal(true)
  }

  function openEditNotice(n) {
    setNoticeForm({ title: n.title, content: n.content || '' })
    setEditNoticeId(n.id)
    setNoticeModal(true)
  }

  async function removeNotice(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await deleteNotice(id)
    setNotices(await getNotices(profile?.id))
  }

  const { designers, topics, assignments } = data
  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))

  const stats = {
    total:      assignments.length,
    inprogress: assignments.filter(a => a.status === 'inprogress').length,
    completed:  assignments.filter(a => a.status === 'completed').length,
    overdue:    assignments.filter(a => {
      const t = topicMap[String(a.topic_id)]
      return t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
    }).length,
  }

  const byDesigner = designers.map(d => ({
    ...d,
    total:      assignments.filter(a => String(a.designer_id) === String(d.id)).length,
    inprogress: assignments.filter(a => String(a.designer_id) === String(d.id) && a.status !== 'completed').length,
  })).sort((a, b) => b.inprogress - a.inprogress)

  const byTopic = topics.map(t => ({
    ...t,
    count: assignments.filter(a => String(a.topic_id) === String(t.id)).length,
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count)

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
          { label: '전체 배정', value: stats.total,      accent: '#6366f1' },
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
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 15 }}>📢 공지 / 가이드</strong>
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={openAddNotice}>+ 공지 추가</button>
        </div>
        {notices.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 13, padding: '12px 0' }}>
            등록된 공지가 없습니다. 외주 디자이너 링크에 표시할 공지를 추가해보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notices.map(n => (
              <div key={n.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: n.content ? 6 : 0 }}>{n.title}</div>
                    {n.content && (
                      <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{n.content}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEditNotice(n)}>수정</button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => removeNotice(n.id)}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{d.inprogress}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>진행중 / 전체 {d.total}</div>
                </div>
              </div>
            ))
          }
        </div>

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
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{t.count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>명 배정</div>
                </div>
              </div>
            ))
          }
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
              <label>내용</label>
              <textarea value={noticeForm.content} onChange={e => setNoticeForm(p => ({ ...p, content: e.target.value }))}
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
