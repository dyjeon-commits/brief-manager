import React, { useState, useEffect } from 'react'
import { getAll } from '../api'
import { useAuth } from '../AuthContext'

export default function Settlement() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'

  const [designers, setDesigners] = useState([])
  const [assignments, setAssignments] = useState([])
  const [topics, setTopics] = useState([])
  const [templateAssignments, setTemplateAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    setLoading(true)
    const { supabase } = await import('../AuthContext')
    const data = await getAll(profile?.id, isSuperadmin)
    setDesigners(data.designers || [])
    setTopics(data.topics || [])

    // approved_at 포함해서 assignments 로드
    let q = supabase.from('assignments').select('*').not('approved_at', 'is', null)
    const { data: approvedAssignments } = await q

    // template_assignments
    const { data: tmplData } = await supabase.from('template_assignments').select('*')

    setAssignments(approvedAssignments || [])
    setTemplateAssignments(tmplData || [])
    setLoading(false)
  }

  const topicMap = Object.fromEntries(topics.map(t => [String(t.id), t]))
  const designerMap = Object.fromEntries(designers.map(d => [String(d.id), d]))

  // approved_at 기준 월 목록
  const months = [...new Set(
    assignments
      .filter(a => a.approved_at)
      .map(a => a.approved_at.slice(0, 7))
  )].sort((a, b) => b.localeCompare(a))

  // 선택 월 데이터 필터
  const monthAssignments = assignments.filter(a =>
    a.approved_at && a.approved_at.slice(0, 7) === selectedMonth
  )

  // 디자이너별 정산 계산
  const designerSettlements = {}
  monthAssignments.forEach(a => {
    const did = String(a.designer_id)
    const t = topicMap[String(a.topic_id)]
    const tmplList = templateAssignments.filter(
      tm => String(tm.topic_id) === String(a.topic_id) && String(tm.designer_id) === String(a.designer_id)
    )
    const tmplCount = tmplList.length > 0 ? tmplList.length : (t?.qty_per_person || 1)
    const pages = t?.pages || 0
    const conceptFee = t?.concept_fee ?? 200000
    const amount = (conceptFee + 15000 * pages) * tmplCount

    if (!designerSettlements[did]) designerSettlements[did] = { items: [], total: 0 }
    designerSettlements[did].items.push({
      topicName: t?.name || '(삭제된 주제)',
      pages,
      tmplCount,
      conceptFee,
      amount,
      approvedAt: a.approved_at,
    })
    designerSettlements[did].total += amount
  })

  const totalAll = Object.values(designerSettlements).reduce((s, d) => s + d.total, 0)

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>정산</h1>
      </div>

      {/* 월 선택 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {months.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>심사 완료된 배정이 없습니다.</div>
        ) : (
          months.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: selectedMonth === m ? 'var(--accent)' : 'var(--border)',
                color: selectedMonth === m ? 'white' : 'var(--text2)',
              }}>
              {m}
            </button>
          ))
        )}
      </div>

      {months.length > 0 && (
        <>
          {/* 월 합계 */}
          <div style={{ background: 'var(--accent-bg)', border: '1.5px solid var(--accent)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>{selectedMonth} 총 정산</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent)' }}>₩{totalAll.toLocaleString()}</span>
          </div>

          {/* 디자이너별 정산 */}
          {Object.keys(designerSettlements).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>해당 월 정산 내역이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(designerSettlements).map(([did, { items, total }]) => {
                const d = designerMap[did]
                return (
                  <div key={did} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--sidebar-bg)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                          {d?.name?.[0] || '?'}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{d?.name || '알 수 없음'}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>₩{total.toLocaleString()}</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)' }}>주제명</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text2)' }}>페이지</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text2)' }}>템플릿 수</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text2)' }}>컨셉비</th>
                          <th style={{ padding: '8px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--text2)' }}>정산금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 20px', fontWeight: 500 }}>{item.topicName}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text2)' }}>{item.pages}p</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text2)' }}>{item.tmplCount}개</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text2)' }}>₩{item.conceptFee.toLocaleString()}</td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>₩{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr style={{ background: 'var(--sidebar-bg)' }}>
                          <td colSpan={4} style={{ padding: '10px 20px', fontWeight: 700, textAlign: 'right', color: 'var(--text2)' }}>소계</td>
                          <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>₩{total.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
