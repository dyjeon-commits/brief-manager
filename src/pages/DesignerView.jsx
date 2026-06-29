import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kstvoyhhrqvpbeadyzbx.supabase.co',
  'sb_publishable_7ppkQFYB3qYlXnrSVo-zyg_JEOi6iW-'
)

const STATUS_LABEL = {
  assigned: '제출 안함', not_submitted: '제출 안함',
  inprogress: '진행 중', revision1: '1차 수정',
  revising: '수정 중', completed: '완료'
}
const STATUS_COLOR = {
  assigned: '#94a3b8', not_submitted: '#94a3b8',
  inprogress: '#3b82f6', revision1: '#f59e0b',
  revising: '#8b5cf6', completed: '#22c55e'
}

export default function DesignerView({ token }) {
  const [designer, setDesigner] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [topics, setTopics] = useState([])
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [token])

  async function load() {
    setLoading(true)
    const { data: d } = await supabase.from('designers').select('*').eq('token', token).single()
    if (!d) { setNotFound(true); setLoading(false); return }
    setDesigner(d)

    const pmId = d.pm_id
    const [{ data: a }, { data: n }] = await Promise.all([
      supabase.from('assignments').select('*').eq('designer_id', d.id),
      pmId
        ? supabase.from('notices').select('*').eq('pm_id', pmId).order('created_at', { ascending: false })
        : supabase.from('notices').select('*').order('created_at', { ascending: false }),
    ])

    const topicIds = (a || []).map(x => x.topic_id)
    let topicData = []
    if (topicIds.length > 0) {
      const { data: t } = await supabase.from('topics').select('*').in('id', topicIds)
      topicData = t || []
    }
    setAssignments(a || [])
    setTopics(topicData)
    setNotices(n || [])
    setLoading(false)
  }

  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      불러오는 중...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748b' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>유효하지 않은 링크입니다</div>
      <div style={{ fontSize: 14 }}>담당자에게 문의해주세요.</div>
    </div>
  )

  const active = assignments.filter(a => a.status !== 'completed')
  const completed = assignments.filter(a => a.status === 'completed')

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#ede9fe', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
          {designer.name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{designer.name}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>배정된 기획서 목록</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#6366f1' }}>{active.length}</div>
            <div style={{ color: '#64748b' }}>진행중</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#22c55e' }}>{completed.length}</div>
            <div style={{ color: '#64748b' }}>완료</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>

        {/* 공지/가이드 */}
        {notices.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
              📢 공지 / 가이드
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notices.map(n => <NoticeAccordion key={n.id} n={n} />)}
            </div>
          </div>
        )}

        {/* 기획서 목록 */}
        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16 }}>배정된 기획서가 없습니다.</div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>진행중 ({active.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {active.map(a => <AssignmentCard key={a.id} a={a} t={topicMap[String(a.topic_id)]} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>완료 ({completed.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
                  {completed.map(a => <AssignmentCard key={a.id} a={a} t={topicMap[String(a.topic_id)]} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NoticeAccordion({ n }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>{n.title}</span>
        <span style={{ fontSize: 16, color: '#b45309', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </div>
      {open && n.content && (
        <div style={{ padding: '0 18px 14px', fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: 1.7, borderTop: '1px solid #fde68a' }}>
          <div style={{ paddingTop: 12 }}>
            {n.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
              /^https?:\/\//.test(part)
                ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: 600, textDecoration: 'underline' }}>{part}</a>
                : part
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ a, t }) {
  const isOverdue = t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
  const status = a.status || 'not_submitted'
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: `1.5px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t?.name || '-'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13, color: '#64748b' }}>
          {t?.type && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t.type}</span>}
          {t?.deadline && (
            <span style={{ color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 400 }}>
              📅 {t.deadline}{isOverdue ? ' (마감초과)' : ''}
            </span>
          )}
          {t?.pages && <span>📄 {t.pages}p</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <span style={{ background: (STATUS_COLOR[status] || '#94a3b8') + '22', color: STATUS_COLOR[status] || '#94a3b8', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
          {STATUS_LABEL[status] || status}
        </span>
        {t?.brief_url && (
          <a href={t.brief_url} target="_blank" rel="noreferrer"
            style={{ background: '#6366f1', color: 'white', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            기획서 열기 →
          </a>
        )}
      </div>
    </div>
  )
}
