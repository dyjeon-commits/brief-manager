function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

let nextId = load('__nextId', 1)
function genId() { const id = nextId++; save('__nextId', nextId); return id }

// ── 디자이너 ──────────────────────────────────────────────
export function getDesigners() { return load('designers', []) }
export function addDesigner(data) {
  const list = getDesigners()
  const item = { id: genId(), ...data }
  list.push(item)
  save('designers', list)
  return item
}
export function updateDesigner(data) { save('designers', getDesigners().map(d => d.id === data.id ? { ...d, ...data } : d)) }
export function deleteDesigner(id) {
  save('designers', getDesigners().filter(d => d.id !== id))
  save('assignments', getAssignments().filter(a => a.designerId !== id))
}

// ── 작업주제 ──────────────────────────────────────────────
export function getTopics() { return load('topics', []) }
export function addTopic(data) {
  const list = getTopics()
  const item = { id: genId(), ...data }
  list.push(item)
  save('topics', list)
  return item
}
export function updateTopic(data) { save('topics', getTopics().map(t => t.id === data.id ? { ...t, ...data } : t)) }
export function deleteTopic(id) {
  save('topics', getTopics().filter(t => t.id !== id))
  save('assignments', getAssignments().filter(a => a.topicId !== id))
}

// ── 배정 ──────────────────────────────────────────────────
export function getAssignments() { return load('assignments', []) }
export function addAssignment(data) {
  const list = getAssignments()
  const item = { id: genId(), status: 'assigned', createdAt: new Date().toISOString(), ...data }
  list.push(item)
  save('assignments', list)
  return item
}
export function deleteAssignment(id) { save('assignments', getAssignments().filter(a => a.id !== id)) }
export function updateAssignmentStatus(id, status) {
  save('assignments', getAssignments().map(a => a.id === id ? { ...a, status } : a))
}
