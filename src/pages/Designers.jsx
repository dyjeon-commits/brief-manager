import React, { useState, useEffect } from 'react'
import { getAll, addDesigner, updateDesigner, deleteDesigner } from '../api'

const EMPTY = { name: '', contact: '', specialty: '', note: '' }

export default function Designers() {
  const [designers, setDesigners] = useState([])
  const [assignments, setAssignments] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getAll()
    setDesigners(data.designers || [])
    setAssignments(data.assignments || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(d) {
    setForm({ name: d.name, contact: d.contact || '', specialty: d.specialty || '', note: d.note || '' })
    setEditId(d.id); setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) await updateDesigner({ id: editId, ...form })
    else await addDesigner(form)
    setSaving(false)
    setModal(false)
    load()
  }

  async function remove(id) {
    const count = assignments.filter(a => String(a.designer_id) === String(id)).length
    const msg = count > 0 ? `이 디자이너의 배정 ${count}건도 함께 삭제됩니다. 계속할까요?` : '삭제할까요?'
    if (!confirm(msg)) return
    await deleteDesigner(id)
    load()
  }

  const countFor = (id) => ({
    total:  assignments.filter(a => String(a.designer_id) === String(id)).length,
    active: assignments.filter(a => String(a.designer_id) === String(id) && a.status !== 'completed').length,
  })

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  return (
    <div>
      <div className="ph">
        <h1>디자이너 관리</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ 디자이너 추가</button>
      </div>

      {designers.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">👤</div>
          <p>등록된 디자이너가 없습니다.</p>
          <button className="btn btn-primary" onClick={openAdd}>첫 디자이너 추가하기</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {designers.map(d => {
            const { total, active } = countFor(d.id)
            return (
              <div key={d.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                    {d.name[0]}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openEdit(d)}>수정</button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => remove(d.id)}>삭제</button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{d.name}</div>
                {d.specialty && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, marginBottom: 4 }}>{d.specialty}</div>}
                {d.contact && <div style={{ fontSize: 13, color: 'var(--text2)' }}>📞 {d.contact}</div>}
                {d.note && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>{d.note}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>
                  <span>전체 {total}건</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>진행중 {active}건</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '디자이너 수정' : '디자이너 추가'}</h2>
            {[
              { label: '이름 *', key: 'name', placeholder: '홍길동' },
              { label: '연락처', key: 'contact', placeholder: '010-0000-0000 또는 이메일' },
              { label: '전문분야', key: 'specialty', placeholder: 'UX/UI, 그래픽, 영상 등' },
            ].map(f => (
              <div key={f.key} className="fg">
                <label>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="fg">
              <label>메모</label>
              <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="참고사항" />
            </div>
            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? '저장 중...' : editId ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
