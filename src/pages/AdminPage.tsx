import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'
import QuestionEditor from '../components/admin/QuestionEditor'
import ExamManager from '../components/admin/ExamManager'
import StudentManager from '../components/admin/StudentManager'
import ResultsManager from '../components/admin/ResultsManager'
import DocumentGenerator from '../components/admin/DocumentGenerator'
import RealTimeMonitor from '../components/admin/RealTimeMonitor'
import Dashboard from '../components/admin/Dashboard'
import { 
  LayoutDashboard, 
  FileEdit, 
  ClipboardList, 
  Users, 
  BarChart3, 
  Printer, 
  Monitor,
  Settings
} from 'lucide-react'

const AdminPage: React.FC = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'questions', label: 'Bank Soal', icon: FileEdit, path: '/admin/questions' },
    { id: 'exams', label: 'Paket Ujian', icon: ClipboardList, path: '/admin/exams' },
    { id: 'students', label: 'Siswa & Kelas', icon: Users, path: '/admin/students' },
    { id: 'results', label: 'Hasil & Nilai', icon: BarChart3, path: '/admin/results' },
    { id: 'documents', label: 'Dokumen', icon: Printer, path: '/admin/documents' },
    { id: 'monitor', label: 'Monitoring', icon: Monitor, path: '/admin/monitor' },
    { id: 'settings', label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
  ]

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel Admin</h1>
        <p className="text-muted-foreground">Kelola semua aspek aplikasi CBT AKM</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Menu */}
        <div className="col-span-2">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path)
                  const Icon = item.icon
                  
                  return (
                    <Link key={item.id} to={item.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/questions/*" element={<QuestionEditor />} />
            <Route path="/exams/*" element={<ExamManager />} />
            <Route path="/students/*" element={<StudentManager />} />
            <Route path="/results/*" element={<ResultsManager />} />
            <Route path="/documents/*" element={<DocumentGenerator />} />
            <Route path="/monitor/*" element={<RealTimeMonitor />} />
            <Route path="/settings" element={<div>Pengaturan</div>} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
