import React, { useState } from 'react'
import { useData } from '../DataContext'
import { monthKey } from '../dateUtils'

const thStyle = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
const tdStyle = { padding: '11px 16px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 13 }

export default function Settlement() {
  const { designers, settlements, loading } = useData()
  const [month, setMonth] = useState(monthKey())
  const [expandedId, setExpandedId] = useState(null)

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  // 심사완료(approved) 상태인 정산만 합산 — 취소된(un-approve된) 건은 자동으로 빠짐
  // month는 구글시트가 "YYYY-MM" 문자열을 날짜로 자동 변환해 저장할 수 있어 monthKey로 다시 정규화한다
  const monthSettlements = settlements.filter(s => monthKey(s.month) === month && s.status === 'approved')
  const byDesigner = designers
    .map(d => {
      const rows = monthSettlements.filter(s => String(s.designer_id) === String(d.id))
      const total = rows.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      return { designer: d, rows, total }
    })
    .filter(x => x.rows.length > 0 || x.designer.monthly_limit)
    .sort((a, b) => b.total - a.total)

  const grandTotal = byDesigner.reduce((s, x) => s + x.total, 0)

  return (
    <div>
      <div className="ph">
        <h1>정산 관리</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--surface)' }} />
      </div>

      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1d4ed8' }}>
        💡 여기 보이는 정산액은 "심사 완료"로 확정된 건만 집계돼요. 나중에 그 배정이나 주제를 지워도 이 기록은 그대로 남습니다.
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{month} 심사완료 기준 총 정산액</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#0891b2' }}>₩{grandTotal.toLocaleString()}</div>
      </div>

      {byDesigner.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">💰</div>
          <p>이 달에 심사완료된 정산 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['디자이너', '건수', '정산액', '월 한도', '', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {byDesigner.map(({ designer: d, rows, total }) => {
                const over = d.monthly_limit && total > Number(d.monthly_limit)
                const expanded = expandedId === d.id
                return (
                  <React.Fragment key={d.id}>
                    <tr onClick={() => setExpandedId(expanded ? null : d.id)} style={{ cursor: rows.length > 0 ? 'pointer' : 'default' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name}</td>
                      <td style={tdStyle}>{rows.length}건</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0891b2' }}>₩{total.toLocaleString()}</td>
                      <td style={tdStyle}>{d.monthly_limit ? `₩${Number(d.monthly_limit).toLocaleString()}` : '-'}</td>
                      <td style={tdStyle}>
                        {over && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠️ 한도 초과</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text2)' }}>{rows.length > 0 ? (expanded ? '▲' : '▼') : ''}</td>
                    </tr>
                    {expanded && rows.map(s => (
                      <tr key={s.id} style={{ background: '#f8fafc' }}>
                        <td colSpan={2} style={{ ...tdStyle, paddingLeft: 32, color: 'var(--text2)' }}>ㄴ {s.topic_name || '(삭제된 주제)'}</td>
                        <td style={{ ...tdStyle, color: '#0891b2', fontWeight: 600 }}>₩{Number(s.amount || 0).toLocaleString()}</td>
                        <td colSpan={3} style={{ ...tdStyle, fontSize: 11, color: 'var(--text2)' }}>템플릿 {s.template_count}개 · 페이지 {s.pages}p · 컨셉비용 ₩{Number(s.concept_fee || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
