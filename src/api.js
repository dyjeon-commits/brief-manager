import { call } from './backend'

export async function getAll(pmId = null) {
  const data = await call('getAll')
  const filterByPm = (rows) => pmId ? rows.filter(r => String(r.pm_id) === String(pmId)) : rows

  const designers = filterByPm(data.designers || [])
  const topics = filterByPm(data.topics || [])
  const labels = filterByPm(data.labels || [])

  const dIds = new Set(designers.map(d => d.id))
  const tIds = new Set(topics.map(t => t.id))
  const filteredAssignments = (data.assignments || []).filter(a => a.topic_id && dIds.has(a.designer_id) && tIds.has(a.topic_id))

  return {
    designers,
    topics,
    assignments: filteredAssignments,
    labels,
    designerLabels: data.designerLabels || [],
    topicLabels: data.topicLabels || [],
    templateAssignments: data.templateAssignments || [],
  }
}

export async function addDesigner(data, pmId) {
  return call('insert', {
    sheet: 'designers',
    row: { name: data.name, nickname: data.nickname, specialty: data.specialty, note: data.note, pm_id: pmId },
  })
}
export async function updateDesigner(data) {
  const { id, ...rest } = data
  await call('update', {
    sheet: 'designers',
    id,
    patch: { name: rest.name, nickname: rest.nickname, specialty: rest.specialty, note: rest.note },
  })
}
export async function deleteDesigner(id) {
  await call('delete', { sheet: 'designers', id })
}

// Template assignments
export async function getTemplateAssignments(topicId) {
  const all = await call('getTemplateAssignments', { topicId })
  return all.sort((a, b) => Number(a.template_idx) - Number(b.template_idx))
}
export async function setTemplateAssignments(topicId, assignments) {
  await call('setJoin', {
    sheet: 'template_assignments',
    keyField: 'topic_id',
    keyValue: topicId,
    rows: assignments.map(a => ({ topic_id: topicId, template_idx: a.templateIdx, designer_id: a.designerId })),
  })
}

export async function addTopic(data, pmId) {
  return call('insert', {
    sheet: 'topics',
    row: {
      name: data.name,
      brief_url: data.briefUrl,
      type: data.type,
      type2: data.type2,
      deadline: data.deadline || null,
      pages: data.pages ? parseInt(data.pages) : null,
      notice: data.notice || null,
      qty_per_person: data.qtyPerPerson ? parseInt(data.qtyPerPerson) : 1,
      concept_fee: data.conceptFee ? parseInt(data.conceptFee) : 200000,
      pm_id: pmId,
    },
  })
}
export async function updateTopic(data) {
  const { id, ...rest } = data
  await call('update', {
    sheet: 'topics',
    id,
    patch: {
      name: rest.name,
      brief_url: rest.briefUrl,
      type: rest.type,
      type2: rest.type2,
      deadline: rest.deadline || null,
      pages: rest.pages ? parseInt(rest.pages) : null,
      notice: rest.notice || null,
      qty_per_person: rest.qtyPerPerson ? parseInt(rest.qtyPerPerson) : 1,
      concept_fee: rest.conceptFee ? parseInt(rest.conceptFee) : 200000,
    },
  })
}
export async function deleteTopic(id) {
  await call('setJoin', { sheet: 'template_assignments', keyField: 'topic_id', keyValue: id, rows: [] })
  await call('setJoin', { sheet: 'topic_labels', keyField: 'topic_id', keyValue: id, rows: [] })
  // 심사완료(approved)된 배정은 작업 이력 보존을 위해 삭제하지 않음 — topic_id만 끊어서 조회에서만 제외
  const all = await call('getAll')
  const toClear = (all.assignments || []).filter(a => String(a.topic_id) === String(id) && a.approved_at)
  const toDelete = (all.assignments || []).filter(a => String(a.topic_id) === String(id) && !a.approved_at)
  await Promise.all([
    ...toClear.map(a => call('update', { sheet: 'assignments', id: a.id, patch: { topic_id: '' } })),
    ...toDelete.map(a => call('delete', { sheet: 'assignments', id: a.id })),
  ])
  await call('delete', { sheet: 'topics', id })
}

export async function addAssignment(data) {
  return call('insert', {
    sheet: 'assignments',
    row: {
      designer_id: data.designerId,
      topic_id: data.topicId,
      status: 'assigned',
      visible_at: data.visibleAt ? new Date(data.visibleAt + 'T00:00:00').toISOString() : null,
    },
  })
}
export async function deleteAssignment(id) {
  const all = await call('getAll')
  const a = (all.assignments || []).find(x => String(x.id) === String(id))
  if (a?.status === 'approved') {
    // 심사완료 배정은 이력 보존을 위해 topic_id만 null로 처리 (배정 현황에서만 사라짐)
    await call('update', { sheet: 'assignments', id, patch: { topic_id: '' } })
  } else {
    await call('delete', { sheet: 'assignments', id })
  }
}
export async function updateAssignmentStatus(id, status, topicName = null) {
  const patch = { status }
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString()
    if (topicName) patch.topic_name = topicName
  } else {
    patch.approved_at = ''
  }
  await call('update', { sheet: 'assignments', id, patch })
}
export async function updateAssignmentDeadline(id, deadline) {
  await call('update', { sheet: 'assignments', id, patch: { deadline: deadline || '' } })
}
export async function setAssignmentTiers(tierUpdates) {
  await Promise.all(tierUpdates.map(({ id, tier }) =>
    call('update', { sheet: 'assignments', id, patch: { tier } })
  ))
}

// Labels
export async function getLabels() {
  return call('getAll').then(d => d.labels || [])
}
export async function addLabel(name, color, pmId, parentId = null) {
  return call('insert', { sheet: 'labels', row: { name, color, pm_id: pmId, parent_id: parentId || '' } })
}
export async function updateLabel(id, name, color) {
  await call('update', { sheet: 'labels', id, patch: { name, color } })
}
export async function deleteLabel(id) {
  await call('delete', { sheet: 'labels', id })
}

// Designer labels
export async function setDesignerLabels(designerId, labelIds) {
  await call('setJoin', {
    sheet: 'designer_labels',
    keyField: 'designer_id',
    keyValue: designerId,
    rows: labelIds.map(lid => ({ designer_id: designerId, label_id: lid })),
  })
}

// Notices
export async function getNotices(pmId) {
  return call('getNotices', { pmId })
}
export async function addNotice(title, content, pmId) {
  return call('insert', { sheet: 'notices', row: { title, content, pm_id: pmId } })
}
export async function updateNotice(id, title, content) {
  await call('update', { sheet: 'notices', id, patch: { title, content } })
}
export async function deleteNotice(id) {
  await call('delete', { sheet: 'notices', id })
}

// Topic labels
export async function setTopicLabels(topicId, labelIds) {
  await call('setJoin', {
    sheet: 'topic_labels',
    keyField: 'topic_id',
    keyValue: topicId,
    rows: labelIds.map(lid => ({ topic_id: topicId, label_id: lid })),
  })
}

// Team (로그인용 계정 목록)
export async function getTeam() {
  return call('getAll').then(d => d.team || [])
}
export async function addTeamMember(name, role) {
  return call('insert', { sheet: 'team', row: { name, role } })
}
export async function deleteTeamMember(id) {
  await call('delete', { sheet: 'team', id })
}

// 디자이너 전용 뷰 (로그인 없이 토큰으로 조회)
export async function getDesignerView(token) {
  return call('getDesignerView', { token })
}
