import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './components/layout/ThemeProvider'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import StudentPage from './pages/StudentPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import { supabaseService } from './services/supabase'
import './styles/globals.css'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabaseService.getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="cbt-theme">
      <Router>
        <div className="min-h-screen bg-background text-foreground">
          <Header user={user} />
          <div className="flex">
            {user && <Sidebar user={user} />}
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                
                <Route path="/admin/*" element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']} user={user}>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/student/*" element={
                  <ProtectedRoute allowedRoles={['student']} user={user}>
                    <StudentPage />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
          </div>
          <Toaster position="top-right" />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
