import React, { useState, useEffect } from 'react'
import { getAll } from '../api'

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState({ designers: [], topics: [], assignments: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAll().then(d => { setData(d); setLoading(false) })
  }, [])

  const { designers, topics, assignments } = data
  const designerMap = Object.fromEntries(designers.map(d => [String(d.id), d]))
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
    </div>
  )
}
