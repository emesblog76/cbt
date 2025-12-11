import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import ExamPortal from '../components/student/ExamPortal'
import ExamSession from '../components/student/ExamSession'
import ResultsView from '../components/student/ResultsView'
import { supabaseService } from '../services/supabase'
import { 
  Home, 
  ClipboardList, 
  History, 
  Award, 
  Clock,
  Calendar,
  BookOpen
} from 'lucide-react'

const StudentPage: React.FC = () => {
  const location = useLocation()
  const [exams, setExams] = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      // Fetch published exams
      const { data: examsData } = await supabaseService.getExams()
      setExams(examsData || [])

      // Filter upcoming exams
      const now = new Date()
      const upcoming = examsData?.filter((exam: any) => 
        exam.start_time && new Date(exam.start_time) > now
      ) || []
      setUpcomingExams(upcoming)

      // Fetch active sessions
      const user = await supabaseService.getCurrentUser()
      if (user) {
        const { data: sessions } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'active')
        
        setActiveSessions(sessions || [])
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    }
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Portal Siswa</h1>
            <p className="text-muted-foreground">Akses ujian dan lihat hasil belajar Anda</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {activeSessions.length} Ujian Aktif
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Calendar className="w-3 h-3 mr-1" />
              {upcomingExams.length} Mendatang
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <Link to="/student">
                <Button variant="ghost" className="w-full justify-start">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/student/exams">
                <Button variant="ghost" className="w-full justify-start">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Ujian Tersedia
                </Button>
              </Link>
              <Link to="/student/active">
                <Button variant="ghost" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ujian Aktif
                </Button>
              </Link>
              <Link to="/student/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-4 h-4 mr-2" />
                  Riwayat Ujian
                </Button>
              </Link>
              <Link to="/student/results">
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Hasil & Nilai
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Active Exams */}
          {activeSessions.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ujian Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{session.exam_title}</p>
                      <p className="text-sm text-muted-foreground">
                        Dimulai: {new Date(session.start_time).toLocaleTimeString()}
                      </p>
                      <Button size="sm" className="w-full mt-2" asChild>
                        <Link to={`/student/exam/${session.id}`}>
                          Lanjutkan
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          <Routes>
            <Route path="/" element={
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Selamat Datang!</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Selamat datang di portal siswa CBT AKM. Anda dapat mengakses ujian yang tersedia, melanjutkan ujian yang sedang berjalan, atau melihat hasil ujian sebelumnya.</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <ClipboardList className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-lg">{exams.length}</h3>
                        <p className="text-sm text-muted-foreground">Total Ujian</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-bold text-lg">{activeSessions.length}</h3>
                        <p className="text-sm text-muted-foreground">Sedang Berjalan</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Award className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-bold text-lg">0</h3>
                        <p className="text-sm text-muted-foreground">Selesai Dinilai</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {upcomingExams.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ujian Mendatang</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {upcomingExams.slice(0, 3).map((exam) => (
                          <div key={exam.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{exam.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {exam.subject_name} • {exam.duration_minutes} menit
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                {new Date(exam.start_time).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(exam.start_time).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            } />
            <Route path="/exams" element={<ExamPortal />} />
            <Route path="/exam/:sessionId" element={<ExamSession />} />
            <Route path="/results" element={<ResultsView />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default StudentPage
