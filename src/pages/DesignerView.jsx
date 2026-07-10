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
  const [templateAssignments, setTemplateAssignments] = useState([])
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
    let topicData = [], tmplData = []
    if (topicIds.length > 0) {
      const [{ data: t }, { data: tm }] = await Promise.all([
        supabase.from('topics').select('*').in('id', topicIds),
        supabase.from('template_assignments').select('*').eq('designer_id', d.id),
      ])
      topicData = t || []
      tmplData = tm || []
    }
    setAssignments(a || [])
    setTopics(topicData)
    setNotices(n || [])
    setTemplateAssignments(tmplData)
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

  // 총 템플릿 수 계산
  const totalTmpl = assignments.reduce((sum, a) => {
    const idxList = templateAssignments.filter(tm => String(tm.topic_id) === String(a.topic_id)).map(tm => tm.template_idx)
    const t = topicMap[String(a.topic_id)]
    return sum + (idxList.length > 0 ? idxList.length : (t?.qty_per_person || 1))
  }, 0)

  // 마감일별 그룹 (진행중만)
  const deadlineGroups = {}
  active.forEach(a => {
    const t = topicMap[String(a.topic_id)]
    if (!t?.deadline) return
    if (!deadlineGroups[t.deadline]) deadlineGroups[t.deadline] = { count: 0, tmpl: 0 }
    const idxList = templateAssignments.filter(tm => String(tm.topic_id) === String(a.topic_id))
    deadlineGroups[t.deadline].count++
    deadlineGroups[t.deadline].tmpl += idxList.length > 0 ? idxList.length : (t?.qty_per_person || 1)
  })

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

        {/* 총 제작 수량 요약 */}
        {Object.keys(deadlineGroups).length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
              📦 총 제작 수량
            </div>
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(deadlineGroups).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([deadline, { tmpl }]) => {
                const today = new Date(); today.setHours(0,0,0,0)
                const d = new Date(deadline); d.setHours(0,0,0,0)
                const diff = Math.round((d - today) / (1000*60*60*24))
                const isPast = diff < 0
                const label = diff === 0 ? '오늘' : isPast ? `D+${Math.abs(diff)}` : `D-${diff}`
                const color = isPast ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#6366f1'
                return (
                  <div key={deadline} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40 }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#475569' }}>마감일 {deadline}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color }}>총 {tmpl}개</span>
                  </div>
                )
              })}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {active.map(a => <AssignmentCard key={a.id} a={a} t={topicMap[String(a.topic_id)]} tmplIdxList={templateAssignments.filter(tm => String(tm.topic_id) === String(a.topic_id)).map(tm => tm.template_idx).sort((x,y)=>x-y)} />)}
                </div>
              </div>
            )}
            {false && completed.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>완료 ({completed.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
                  {completed.map(a => <AssignmentCard key={a.id} a={a} t={topicMap[String(a.topic_id)]} tmplIdxList={templateAssignments.filter(tm => String(tm.topic_id) === String(a.topic_id)).map(tm => tm.template_idx).sort((x,y)=>x-y)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RenderNoticeContent({ text }) {
  const parts = text.split(/(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g)
  const result = []
  let i = 0
  while (i < parts.length) {
    if (/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.test(parts[i])) {
      const m = parts[i].match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
      result.push(<a key={i} href={m[2]} target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: 600, textDecoration: 'underline' }}>{m[1]}</a>)
      i += 3
    } else {
      // 일반 URL도 링크로
      const subParts = (parts[i] || '').split(/(https?:\/\/[^\s]+)/g)
      subParts.forEach((sp, j) => {
        if (/^https?:\/\//.test(sp)) result.push(<a key={`${i}-${j}`} href={sp} target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: 600, textDecoration: 'underline' }}>{sp}</a>)
        else if (sp) result.push(sp)
      })
      i++
    }
  }
  return <>{result}</>
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
          <div style={{ paddingTop: 12 }}><RenderNoticeContent text={n.content} /></div>
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ a, t, tmplIdxList = [] }) {
  const isOverdue = t?.deadline && a.status !== 'completed' && new Date(t.deadline) < new Date()
  const status = a.status || 'not_submitted'
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: `1.5px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t?.name || '-'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13, color: '#64748b' }}>
            {t?.type && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t.type}</span>}
            {t?.deadline && (
              <span style={{ color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 400 }}>
                📅 마감일 {t.deadline}
              </span>
            )}
            {t?.pages && <span>📄 페이지 수 {t.pages}p</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {status !== 'not_submitted' && status !== 'assigned' && (
            <span style={{ background: (STATUS_COLOR[status] || '#94a3b8') + '22', color: STATUS_COLOR[status] || '#94a3b8', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {STATUS_LABEL[status] || status}
            </span>
          )}
          {t?.brief_url && (
            <a href={t.brief_url} target="_blank" rel="noreferrer"
              style={{ background: '#6366f1', color: 'white', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              기획서 열기 →
            </a>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <div style={{ padding: '10px 16px', background: '#dbeafe', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 72 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>총 제작 수량</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
            {tmplIdxList.length > 0 ? tmplIdxList.length : (t?.qty_per_person || 1)}개
          </span>
        </div>
        {tmplIdxList.length > 0 && (
          <div style={{ flex: 1, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>📐 담당 템플릿</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tmplIdxList.map(idx => (
                <span key={idx} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 5, padding: '2px 8px', fontSize: 12, color: '#334155', fontWeight: 600 }}>idx {idx}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {t?.notice && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          📌 {t.notice}
        </div>
      )}
    </div>
  )
}
