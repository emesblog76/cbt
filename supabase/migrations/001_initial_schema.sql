-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'teacher', 'student')),
    class_id UUID,
    school_level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50),
    school_year VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES classes(id),
    question_type VARCHAR(50) NOT NULL CHECK (
        question_type IN ('multiple_choice', 'multiple_select', 'matching', 'short_answer', 'essay')
    ),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'challenging')),
    cognitive_level VARCHAR(50),
    stimulus TEXT,
    question_text TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    year INTEGER,
    semester VARCHAR(20),
    kd_cp TEXT,
    material TEXT,
    indicator TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Question options for multiple choice/select
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_label VARCHAR(1),
    is_correct BOOLEAN DEFAULT FALSE,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Matching pairs
CREATE TABLE matching_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    left_item TEXT NOT NULL,
    right_item TEXT NOT NULL,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Correct answers for short answer questions
CREATE TABLE short_answer_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL,
    is_case_sensitive BOOLEAN DEFAULT FALSE,
    tolerance_range DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES classes(id),
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exam questions junction
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 1,
    sort_order INTEGER,
    UNIQUE(exam_id, question_id)
);

-- Exam sessions
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id),
    student_id UUID REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'graded', 'expired')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(exam_id, student_id)
);

-- Student answers
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    answer_text TEXT,
    selected_options UUID[],
    matching_answers JSONB,
    is_auto_graded BOOLEAN DEFAULT FALSE,
    points_awarded DECIMAL(5,2),
    teacher_comment TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Attachments (images, audio, video)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX idx_student_answers_session ON student_answers(session_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher'))
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Questions policies
CREATE POLICY "Anyone can view published questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Teachers and admins can manage questions" ON questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher'))
    );

-- Exams policies
CREATE POLICY "Students can view published exams" ON exams
    FOR SELECT USING (is_published = true OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher')));

CREATE POLICY "Teachers and admins can manage exams" ON exams
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher'))
    );

-- Exam sessions policies
CREATE POLICY "Students can view own sessions" ON exam_sessions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view all sessions" ON exam_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher'))
    );

CREATE POLICY "Students can create sessions" ON exam_sessions
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Student answers policies
CREATE POLICY "Students can view own answers" ON student_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_sessions es 
            WHERE es.id = session_id AND es.student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view all answers" ON student_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type IN ('admin', 'teacher'))
    );

CREATE POLICY "Students can insert own answers" ON student_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM exam_sessions es 
            WHERE es.id = session_id AND es.student_id = auth.uid()
        )
    );

-- Functions and Triggers

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers for updated_at
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_answers_updated_at BEFORE UPDATE ON student_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
