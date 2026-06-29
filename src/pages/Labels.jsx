import React, { useState, useEffect } from 'react'
import { getAll, addLabel, updateLabel, deleteLabel } from '../api'
import { useAuth } from '../AuthContext'

const COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b']

export default function Labels() {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'
  const [labels, setLabels] = useState([])
  const [designerLabels, setDesignerLabels] = useState([])
  const [designers, setDesigners] = useState([])
  const [modal, setModal] = useState(false)
  // mode: 'category' | 'child'
  const [modalMode, setModalMode] = useState('category')
  const [parentId, setParentId] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#6366f1' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [profile])

  async function load() {
    setLoading(true)
    const data = await getAll(profile?.id, isSuperadmin)
    setLabels(data.labels || [])
    setDesignerLabels(data.designerLabels || [])
    setDesigners(data.designers || [])
    setLoading(false)
  }

  function openAddCategory() {
    setForm({ name: '', color: '#6366f1' })
    setEditId(null); setParentId(null); setModalMode('category'); setModal(true)
  }

  function openAddChild(pid, parentColor) {
    setForm({ name: '', color: parentColor })
    setEditId(null); setParentId(pid); setModalMode('child'); setModal(true)
  }

  function openEdit(l) {
    setForm({ name: l.name, color: l.color })
    setEditId(l.id); setParentId(l.parent_id || null)
    setModalMode(l.parent_id ? 'child' : 'category')
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) await updateLabel(editId, form.name.trim(), form.color)
    else await addLabel(form.name.trim(), form.color, profile?.id, parentId)
    setSaving(false); setModal(false); load()
  }

  async function remove(l, childCount = 0) {
    const used = designerLabels.filter(dl => dl.label_id === l.id).length
    let msg = `"${l.name}" 라벨을 삭제할까요?`
    if (childCount > 0) msg = `"${l.name}" 카테고리와 하위 라벨 ${childCount}개가 모두 삭제됩니다. 계속할까요?`
    else if (used > 0) msg = `이 라벨은 ${used}명에게 사용 중입니다. 삭제할까요?`
    if (!confirm(msg)) return
    await deleteLabel(l.id); load()
  }

  const categories = labels.filter(l => !l.parent_id)
  const childrenOf = (pid) => labels.filter(l => l.parent_id === pid)
  const countDesigners = id => designerLabels.filter(dl => dl.label_id === id).length

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>불러오는 중...</div>

  const parentLabel = parentId ? labels.find(l => l.id === parentId) : null

  return (
    <div>
      <div className="ph">
        <h1>라벨 관리</h1>
        <button className="btn btn-primary" onClick={openAddCategory}>+ 카테고리 추가</button>
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
        카테고리를 만들고 하위 라벨을 추가하세요. 디자이너·작업주제에 붙이면 자동 매칭에 활용됩니다.
      </p>

      {categories.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">🏷️</div>
          <p>등록된 라벨이 없습니다.</p>
          <button className="btn btn-primary" onClick={openAddCategory}>첫 카테고리 추가하기</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map(cat => {
            const children = childrenOf(cat.id)
            return (
              <div key={cat.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${cat.color}` }}>
                {/* 카테고리 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: cat.color + '22', color: cat.color, padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>하위 {children.length}개</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(cat)}>수정</button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => remove(cat, children.length)}>삭제</button>
                  </div>
                </div>

                {/* 하위 라벨 목록 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {children.map(child => (
                    <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: child.color + '18', border: `1.5px solid ${child.color}44`, borderRadius: 20, padding: '4px 10px 4px 12px' }}>
                      <span style={{ color: child.color, fontWeight: 600, fontSize: 13 }}>{child.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 2 }}>{countDesigners(child.id)}명</span>
                      <button onClick={() => openEdit(child)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text2)', padding: '0 2px' }}>✎</button>
                      <button onClick={() => remove(child)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626', padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => openAddChild(cat.id, cat.color)}
                    style={{ background: 'transparent', border: `1.5px dashed ${cat.color}88`, borderRadius: 20, padding: '4px 12px', fontSize: 13, color: cat.color, cursor: 'pointer', fontWeight: 600 }}>
                    + 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <h2>
              {editId
                ? (modalMode === 'category' ? '카테고리 수정' : '라벨 수정')
                : (modalMode === 'category' ? '카테고리 추가' : `"${parentLabel?.name}" 하위 라벨 추가`)}
            </h2>
            <div className="fg">
              <label>{modalMode === 'category' ? '카테고리 이름 *' : '라벨 이름 *'}</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={modalMode === 'category' ? '예: 일러스트, 속도, PPT실력' : '예: 잘함, 못함, 빠름, 느림'} />
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
              <div style={{ marginTop: 10 }}>
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
