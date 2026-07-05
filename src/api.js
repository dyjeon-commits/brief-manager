import { supabase } from './AuthContext'

export async function getAll(pmId = null, isSuperadmin = false) {
  let designersQ = supabase.from('designers').select('*').order('created_at')
  let topicsQ = supabase.from('topics').select('*').order('created_at')

  if (pmId) {
    designersQ = designersQ.eq('pm_id', pmId)
    topicsQ = topicsQ.eq('pm_id', pmId)
  }

  let labelsQ = supabase.from('labels').select('*').order('name')
  if (pmId) labelsQ = labelsQ.eq('pm_id', pmId)

  const [{ data: designers }, { data: topics }, { data: assignments }, { data: labels }, { data: designerLabels }, { data: topicLabels }] = await Promise.all([
    designersQ,
    topicsQ,
    supabase.from('assignments').select('*').order('created_at'),
    labelsQ,
    supabase.from('designer_labels').select('*'),
    supabase.from('topic_labels').select('*'),
  ])

  const dIds = new Set((designers || []).map(d => d.id))
  const tIds = new Set((topics || []).map(t => t.id))
  const filteredAssignments = (assignments || []).filter(a => dIds.has(a.designer_id) || tIds.has(a.topic_id))

  return {
    designers: designers || [],
    topics: topics || [],
    assignments: filteredAssignments,
    labels: labels || [],
    designerLabels: designerLabels || [],
    topicLabels: topicLabels || [],
  }
}

export async function addDesigner(data, pmId) {
  const { data: result } = await supabase.from('designers').insert({ ...data, pm_id: pmId }).select().single()
  return result
}
export async function updateDesigner(data) {
  const { id, ...rest } = data
  await supabase.from('designers').update(rest).eq('id', id)
}

// Template assignments
export async function getTemplateAssignments(topicId) {
  const { data } = await supabase.from('template_assignments').select('*').eq('topic_id', topicId).order('template_idx')
  return data || []
}
export async function setTemplateAssignments(topicId, assignments) {
  await supabase.from('template_assignments').delete().eq('topic_id', topicId)
  if (assignments.length > 0) {
    await supabase.from('template_assignments').insert(assignments.map(a => ({ topic_id: topicId, template_idx: a.templateIdx, designer_id: a.designerId, tier: a.tier || 'standard' })))
  }
}
export async function deleteDesigner(id) {
  await supabase.from('designers').delete().eq('id', id)
}

export async function addTopic(data, pmId) {
  const { data: result } = await supabase.from('topics').insert({
    name: data.name,
    brief_url: data.briefUrl,
    type: data.type,
    type2: data.type2,
    deadline: data.deadline || null,
    pages: data.pages ? parseInt(data.pages) : null,
    notice: data.notice || null,
    qty_per_person: data.qtyPerPerson ? parseInt(data.qtyPerPerson) : 1,
    pm_id: pmId,
  }).select().single()
  return result
}
export async function updateTopic(data) {
  const { id, ...rest } = data
  await supabase.from('topics').update({
    name: rest.name,
    brief_url: rest.briefUrl,
    type: rest.type,
    type2: rest.type2,
    deadline: rest.deadline || null,
    pages: rest.pages ? parseInt(rest.pages) : null,
    notice: rest.notice || null,
    qty_per_person: rest.qtyPerPerson ? parseInt(rest.qtyPerPerson) : 1,
  }).eq('id', id)
}
export async function deleteTopic(id) {
  await supabase.from('template_assignments').delete().eq('topic_id', id)
  await supabase.from('assignments').delete().eq('topic_id', id)
  await supabase.from('topic_labels').delete().eq('topic_id', id)
  await supabase.from('topics').delete().eq('id', id)
}

export async function addAssignment(data) {
  const { data: result } = await supabase.from('assignments').insert({
    designer_id: data.designerId,
    topic_id: data.topicId,
    status: 'assigned',
  }).select().single()
  return result
}
export async function deleteAssignment(id) {
  await supabase.from('assignments').delete().eq('id', id)
}
export async function updateAssignmentStatus(id, status) {
  await supabase.from('assignments').update({ status }).eq('id', id)
}
export async function updateAssignmentDeadline(id, deadline) {
  await supabase.from('assignments').update({ deadline: deadline || null }).eq('id', id)
}

// Labels
export async function getLabels() {
  const { data } = await supabase.from('labels').select('*').order('name')
  return data || []
}
export async function addLabel(name, color, pmId, parentId = null) {
  const { data } = await supabase.from('labels').insert({ name, color, pm_id: pmId, parent_id: parentId }).select().single()
  return data
}
export async function updateLabel(id, name, color) {
  await supabase.from('labels').update({ name, color }).eq('id', id)
}
export async function deleteLabel(id) {
  await supabase.from('labels').delete().eq('id', id)
}

// Designer labels
export async function setDesignerLabels(designerId, labelIds) {
  await supabase.from('designer_labels').delete().eq('designer_id', designerId)
  if (labelIds.length > 0) {
    await supabase.from('designer_labels').insert(labelIds.map(lid => ({ designer_id: designerId, label_id: lid })))
  }
}

// Notices
export async function getNotices(pmId) {
  const { data } = await supabase.from('notices').select('*').eq('pm_id', pmId).order('created_at', { ascending: false })
  return data || []
}
export async function addNotice(title, content, pmId) {
  const { data } = await supabase.from('notices').insert({ title, content, pm_id: pmId }).select().single()
  return data
}
export async function updateNotice(id, title, content) {
  await supabase.from('notices').update({ title, content }).eq('id', id)
}
export async function deleteNotice(id) {
  await supabase.from('notices').delete().eq('id', id)
}

// Topic labels
export async function setTopicLabels(topicId, labelIds) {
  await supabase.from('topic_labels').delete().eq('topic_id', topicId)
  if (labelIds.length > 0) {
    await supabase.from('topic_labels').insert(labelIds.map(lid => ({ topic_id: topicId, label_id: lid })))
  }
}
