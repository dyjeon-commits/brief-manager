import React, { useState, useEffect } from 'react'
import { getAll, addLabel, updateLabel, deleteLabel } from '../api'

const COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b']

export default function Labels() {
  const [labels, setLabels] = useState([])
  const [designerLabels, setDesignerLabels] = useState([])
  const [designers, setDesigners] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#6366f1' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getAll()
    setLabels(data.labels || [])
    setDesignerLabels(data.designerLabels || [])
    setDesigners(data.designers || [])
    setLoading(false)
  }

  function openAdd() { setForm({ name: '', color: '#6366f1' }); setEditId(null); setModal(true) }
  function openEdit(l) { setForm({ name: l.name, color: l.color }); setEditId(l.id); setModal(true) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) await updateLabel(editId, form.name.trim(), form.color)
    else await addLabel(form.name.trim(), form.color)
    setSaving(false); setModal(false); load()
  }

  async function remove(l) {
    const count = designerLabels.filter(dl => dl.label_id === l.id).length
    const msg = count > 0 ? `이 라벨은 ${count}명의 디자이너에게 사용 중입니다. 삭제할까요?` : `"${l.name}" 라벨을 삭제할까요?`
    if (!confirm(msg)) return
    await deleteLabel(l.id); load()
  }

  const countDesigners = id => designerLabels.filter(dl => dl.label_id === id).length

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>라벨 관리</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ 라벨 추가</button>
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
        라벨을 만들어 디자이너와 작업주제에 붙이면, 배정 시 자동으로 매칭 후보를 찾아줍니다.
      </p>

      {labels.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">🏷️</div>
          <p>등록된 라벨이 없습니다.</p>
          <button className="btn btn-primary" onClick={openAdd}>첫 라벨 추가하기</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
          {labels.map(l => (
            <div key={l.id} className="card" style={{ padding: 18, borderLeft: `4px solid ${l.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ background: l.color + '22', color: l.color, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>{l.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => openEdit(l)}>수정</button>
                  <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => remove(l)}>삭제</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>디자이너 {countDesigners(l.id)}명 사용 중</div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <h2>{editId ? '라벨 수정' : '라벨 추가'}</h2>
            <div className="fg">
              <label>라벨 이름 *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="예: 고퀄리티, 속도빠름, 신규" />
            </div>
            <div className="fg">
              <label>색상</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #000' : '3px solid transparent', flexShrink: 0 }} />
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: form.color + '22', color: form.color, padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                  {form.name || '미리보기'}
                </span>
              </div>
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? '저장 중...' : editId ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
