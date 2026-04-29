import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export function useSalaryIntelligence() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/salary/widget')
      if (res.data.status === 'success') {
        setData(res.data.data)
      } else {
        setData(null)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
