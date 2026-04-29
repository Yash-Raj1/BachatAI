import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'

const REFRESH_INTERVAL = 60_000 // 60 seconds

export function useStocks() {
  const [stocks,      setStocks]      = useState([])
  const [indices,     setIndices]     = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [gainers,     setGainers]     = useState([])
  const [losers,      setLosers]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error,       setError]       = useState(null)
  const [riskFilter,  setRiskFilter]  = useState('medium')
  const intervalRef = useRef(null)

  const fetchAll = useCallback(async (isBackground = false) => {
    try {
      if (isBackground) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const [stocksRes, indicesRes, suggestRes] = await Promise.all([
        api.get('/stocks/all'),
        api.get('/stocks/indices'),
        api.get(`/stocks/suggestions?risk=${riskFilter}`),
      ])

      setStocks(stocksRes.data.data || [])
      setIndices(indicesRes.data.data || {})
      setSuggestions(suggestRes.data.suggestions || [])
      setGainers(suggestRes.data.top_gainers || [])
      setLosers(suggestRes.data.top_losers || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Stock fetch error:', err)
      setError('Unable to fetch stock data. Market may be closed.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [riskFilter])

  const fetchChart = useCallback(async (symbol) => {
    try {
      const { data } = await api.get(`/stocks/chart/${symbol}?days=30`)
      return data.data || []
    } catch {
      return []
    }
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    fetchAll(false)
    intervalRef.current = setInterval(() => fetchAll(true), REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchAll])

  return {
    stocks, indices, suggestions, gainers, losers,
    loading, refreshing, lastUpdated, error,
    riskFilter, setRiskFilter,
    refetch: () => fetchAll(false),
    fetchChart,
  }
}
