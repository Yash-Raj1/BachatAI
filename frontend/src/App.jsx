import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { PageShimmerLoader } from './components/ui/PageShimmerLoader'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import { SessionWarning } from './components/ui/SessionWarning'
import { MobileBottomNav } from './components/ui/MobileBottomNav'

// Lazy load pages for performance
const Landing = React.lazy(() => import('./pages/Landing'))
const Auth = React.lazy(() => import('./pages/Auth'))
const Onboarding = React.lazy(() => import('./pages/Onboarding'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Transactions = React.lazy(() => import('./pages/Transactions'))
const Forecast = React.lazy(() => import('./pages/Forecast'))
const Investments = React.lazy(() => import('./pages/Investments'))
const TaxSaving = React.lazy(() => import('./pages/TaxSaving'))
const Reports = React.lazy(() => import('./pages/Reports'))
const Settings = React.lazy(() => import('./pages/Settings'))
const NotFound = React.lazy(() => import('./pages/NotFound'))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'))

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  return children
}

const PageLoader = () => <PageShimmerLoader />

import { ChatPanel } from './components/chatbot/ChatPanel'

/** Shows mobile bottom nav only when user is authenticated */
function AuthNav() {
  const { user } = useAuth()
  if (!user) return null
  return <MobileBottomNav />
}

/**
 * IdleGuard — wraps all app content; shows session warning & auto-logs out
 * after 15 minutes of inactivity. Must be inside AuthProvider.
 */
function IdleGuard({ children }) {
  const { user } = useAuth()
  const { showWarning, secondsLeft, extendSession } = useIdleTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 2 * 60 * 1000,  // 2-minute warning
  })

  return (
    <>
      {user && showWarning && (
        <SessionWarning secondsLeft={secondsLeft} onExtend={extendSession} />
      )}
      {children}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <IdleGuard>
          <Router>
            <ChatPanel />
            <AuthNav />
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
                <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
                <Route path="/tax" element={<ProtectedRoute><TaxSaving /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </React.Suspense>
          </Router>
        </IdleGuard>
      </AuthProvider>
    </ThemeProvider>
  )
}
