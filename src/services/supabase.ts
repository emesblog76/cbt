import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
})

// Helper functions
export const supabaseService = {
  // Auth methods
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Questions
  async getQuestions(filters?: any) {
    let query = supabase
      .from('questions')
      .select(`
        *,
        subject:subjects(*),
        class:classes(*),
        options:question_options(*),
        matching_pairs(*),
        short_answer_keys(*)
      `)

    if (filters?.subject_id) {
      query = query.eq('subject_id', filters.subject_id)
    }
    if (filters?.question_type) {
      query = query.eq('question_type', filters.question_type)
    }
    if (filters?.difficulty) {
      query = query.eq('difficulty_level', filters.difficulty)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    return { data, error }
  },

  async createQuestion(questionData: any) {
    const { data, error } = await supabase
      .from('questions')
      .insert([questionData])
      .select()
      .single()
    return { data, error }
  },

  // Exams
  async getExams(includeQuestions: boolean = false) {
    const selectQuery = includeQuestions 
      ? `*, questions:exam_questions(question:questions(*, options:question_options(*), matching_pairs(*)))`
      : `*`

    const { data, error } = await supabase
      .from('exams')
      .select(selectQuery)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async createExamSession(examId: string, studentId: string) {
    const { data, error } = await supabase
      .from('exam_sessions')
      .insert([{
        exam_id: examId,
        student_id: studentId,
        status: 'active'
      }])
      .select()
      .single()
    
    return { data, error }
  },

  // Student answers
  async saveAnswer(sessionId: string, questionId: string, answer: any) {
    const { data, error } = await supabase
      .from('student_answers')
      .upsert([{
        session_id: sessionId,
        question_id: questionId,
        ...answer,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'session_id,question_id'
      })
    
    return { data, error }
  },

  // Grading
  async gradeSession(sessionId: string) {
    const { data: answers, error } = await supabase
      .from('student_answers')
      .select('*, question:questions(*)')
      .eq('session_id', sessionId)
    
    if (error) return { error }

    // Auto-grade logic here
    const gradedAnswers = answers.map(answer => ({
      ...answer,
      is_auto_graded: true,
      points_awarded: calculatePoints(answer)
    }))

    return { data: gradedAnswers, error: null }
  },

  // Real-time subscriptions
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`session_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_answers',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe()
  }
}

// Helper function for calculating points
function calculatePoints(answer: any): number {
  const question = answer.question
  if (!question) return 0

  switch (question.question_type) {
    case 'multiple_choice':
      return gradeMultipleChoice(answer, question)
    case 'multiple_select':
      return gradeMultipleSelect(answer, question)
    case 'matching':
      return gradeMatching(answer, question)
    case 'short_answer':
      return gradeShortAnswer(answer, question)
    default:
      return 0 // Essays need manual grading
  }
}

function gradeMultipleChoice(answer: any, question: any): number {
  const selectedOptionId = answer.selected_options?.[0]
  const correctOption = question.options?.find((opt: any) => opt.is_correct)
  
  if (correctOption && selectedOptionId === correctOption.id) {
    return question.points || 1
  }
  return 0
}

function gradeMultipleSelect(answer: any, question: any): number {
  const selectedIds = answer.selected_options || []
  const correctOptions = question.options?.filter((opt: any) => opt.is_correct) || []
  const correctIds = correctOptions.map((opt: any) => opt.id)
  
  if (correctOptions.length === 0) return 0
  
  const correctSelected = selectedIds.filter((id: string) => correctIds.includes(id)).length
  const incorrectSelected = selectedIds.length - correctSelected
  
  // Partial scoring: (correct - incorrect) / total correct
  const score = Math.max(0, (correctSelected - incorrectSelected) / correctIds.length)
  return score * (question.points || 1)
}

function gradeMatching(answer: any, question: any): number {
  const studentMatches = answer.matching_answers || {}
  const correctPairs = question.matching_pairs || []
  
  if (correctPairs.length === 0) return 0
  
  let correctCount = 0
  correctPairs.forEach((pair: any) => {
    if (studentMatches[pair.left_item] === pair.right_item) {
      correctCount++
    }
  })
  
  return (correctCount / correctPairs.length) * (question.points || 1)
}

function gradeShortAnswer(answer: any, question: any): number {
  const studentAnswer = (answer.answer_text || '').trim().toLowerCase()
  const correctAnswers = question.short_answer_keys || []
  
  for (const correct of correctAnswers) {
    const correctText = correct.correct_answer.toLowerCase()
    if (correct.is_case_sensitive) {
      if (studentAnswer === correctText) {
        return question.points || 1
      }
    } else {
      if (studentAnswer === correctText.toLowerCase()) {
        return question.points || 1
      }
    }
  }
  
  return 0
}
