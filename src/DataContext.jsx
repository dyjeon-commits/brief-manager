import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAll } from './api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { profile } = useAuth()
  const isSuperadmin = profile?.role === 'superadmin'

  const [designers, setDesigners] = useState([])
  const [topics, setTopics] = useState([])
  const [assignments, setAssignments] = useState([])
  const [labels, setLabels] = useState([])
  const [designerLabels, setDesignerLabels] = useState([])
  const [topicLabels, setTopicLabels] = useState([])
  const [templateAssignments, setTemplateAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profile?.id) return
    const data = await getAll(profile.id, isSuperadmin)
    setDesigners(data.designers || [])
    setTopics(data.topics || [])
    setAssignments(data.assignments || [])
    setLabels(data.labels || [])
    setDesignerLabels(data.designerLabels || [])
    setTopicLabels(data.topicLabels || [])
    setTemplateAssignments(data.templateAssignments || [])
    setLoading(false)
  }, [profile?.id, isSuperadmin])

  useEffect(() => {
    if (profile?.id) {
      setLoading(true)
      refresh()
    }
  }, [profile?.id])

  return (
    <DataContext.Provider value={{
      designers, topics, assignments, labels, designerLabels, topicLabels, templateAssignments,
      loading, refresh,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
