import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kstvoyhhrqvpbeadyzbx.supabase.co',
  'sb_publishable_7ppkQFYB3qYlXnrSVo-zyg_JEOi6iW-'
)

export async function getAll() {
  const [{ data: designers }, { data: topics }, { data: assignments }] = await Promise.all([
    supabase.from('designers').select('*').order('created_at'),
    supabase.from('topics').select('*').order('created_at'),
    supabase.from('assignments').select('*').order('created_at'),
  ])
  return { designers: designers || [], topics: topics || [], assignments: assignments || [] }
}

export async function addDesigner(data) {
  const { data: result } = await supabase.from('designers').insert(data).select().single()
  return result
}
export async function updateDesigner(data) {
  const { id, ...rest } = data
  await supabase.from('designers').update(rest).eq('id', id)
}
export async function deleteDesigner(id) {
  await supabase.from('designers').delete().eq('id', id)
}

export async function addTopic(data) {
  const { data: result } = await supabase.from('topics').insert({
    name: data.name,
    brief_url: data.briefUrl,
    type: data.type,
    type2: data.type2,
    deadline: data.deadline || null,
    pages: data.pages ? parseInt(data.pages) : null,
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
  }).eq('id', id)
}
export async function deleteTopic(id) {
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
