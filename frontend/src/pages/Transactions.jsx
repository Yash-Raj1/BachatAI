import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app we fetch this from backend
    // fetchTransactions()
    
    // Simulating data
    const dummyData = [
      { id: '1', date: '2024-01-05', description: 'ACH DEBIT ZOMATO', amount: 450.00, type: 'debit', category: 'Food & Dining', is_anomaly: false },
      { id: '2', date: '2024-01-10', description: 'NEFT TRANSFER SALARY', amount: 85000.00, type: 'credit', category: 'Salary', is_anomaly: false },
      { id: '3', date: '2024-01-15', description: 'UBER INDIA', amount: 320.00, type: 'debit', category: 'Transport', is_anomaly: false },
      { id: '4', date: '2024-01-20', description: 'AMAZON SHOPPING', amount: 4500.00, type: 'debit', category: 'Shopping', is_anomaly: false },
      { id: '5', date: '2024-01-25', description: 'NETFLIX subscription', amount: 199.00, type: 'debit', category: 'Entertainment', is_anomaly: false },
      { id: '6', date: '2024-01-27', description: 'LUXURY WATCH IMPORTS', amount: 45000.00, type: 'debit', category: 'Shopping', is_anomaly: true }
    ]
    
    setTimeout(() => {
      setTransactions(dummyData)
      setLoading(false)
    }, 500)
  }, [])

  return (
    <div className="min-h-screen bg-bg p-6 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-text">Transactions</h1>
          <p className="text-text-secondary">View and filter your financial history.</p>
        </header>

        <Card className="p-0 overflow-hidden bg-card">
          <TransactionTable data={transactions} isLoading={loading} />
        </Card>
      </div>
    </div>
  )
}
