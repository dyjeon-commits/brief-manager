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

  // 모든 디자이너 초기화 (가나다순)
  const designerSettlements = {}
  ;[...designers].sort((a, b) => a.name.localeCompare(b.name, 'ko')).forEach(d => {
    designerSettlements[String(d.id)] = { items: [], total: 0 }
  })

  // 심사완료 배정 계산
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
    const isVariation = tmplList.length > 0
    designerSettlements[did].items.push({
      topicName: t?.name || '(삭제된 주제)',
      pages,
      tmplCount,
      conceptFee,
      isVariation,
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

          {/* 디자이너별 정산 카드 */}
          {Object.keys(designerSettlements).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>해당 월 정산 내역이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {Object.entries(designerSettlements).map(([did, { items, total }]) => {
                const d = designerMap[did]
                const totalPages = items.reduce((s, i) => s + i.pages * i.tmplCount, 0)
                const totalTmpl = items.reduce((s, i) => s + i.tmplCount, 0)
                const totalConceptFee = items.reduce((s, i) => s + i.conceptFee * i.tmplCount, 0)
                return (
                  <div key={did} className="card" style={{ padding: 20 }}>
                    {/* 아바타 + 이름 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                        {d?.name?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{d?.name || '알 수 없음'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{items.length}개 주제</div>
                      </div>
                    </div>

                    {/* 통계 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>총 페이지</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{totalPages}p</div>
                      </div>
                      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>총 템플릿</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{totalTmpl}개</div>
                      </div>
                      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>컨셉비 합계</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>₩{totalConceptFee.toLocaleString()}</div>
                      </div>
                      <div style={{ background: 'var(--accent-bg)', border: '1.5px solid var(--accent)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>정산금액</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>₩{total.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* 주제 목록 */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', maxWidth: '65%' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.topicName}</span>
                            {item.isVariation && <span style={{ flexShrink: 0, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>베리</span>}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>₩{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
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
