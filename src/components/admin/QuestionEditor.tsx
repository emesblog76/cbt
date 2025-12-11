import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabaseService } from '../../services/supabase'
import RichTextEditor from '../shared/RichTextEditor'
import MathInput from '../shared/MathInput'
import FileUpload from '../shared/FileUpload'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'
import { Switch } from '../ui/Switch'
import { toast } from 'react-hot-toast'
import { 
  Save, 
  Upload, 
  Eye, 
  Plus, 
  Trash2, 
  MoveLeft, 
  MoveRight,
  Image as ImageIcon,
  Film,
  Music
} from 'lucide-react'

const questionSchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  question_type: z.enum(['multiple_choice', 'multiple_select', 'matching', 'short_answer', 'essay']),
  difficulty_level: z.enum(['easy', 'medium', 'hard', 'challenging']),
  cognitive_level: z.string(),
  stimulus: z.string().optional(),
  question_text: z.string().min(1, 'Pertanyaan tidak boleh kosong'),
  explanation: z.string().optional(),
  points: z.number().min(1).max(10),
  year: z.number().min(2000).max(2100),
  semester: z.string(),
  kd_cp: z.string(),
  material: z.string(),
  indicator: z.string()
})

type QuestionFormData = z.infer<typeof questionSchema>

const QuestionEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('question')
  const [questionType, setQuestionType] = useState('multiple_choice')
  const [options, setOptions] = useState<Array<{id: string, text: string, isCorrect: boolean}>>([
    { id: '1', text: '', isCorrect: false },
    { id: '2', text: '', isCorrect: false },
    { id: '3', text: '', isCorrect: false },
    { id: '4', text: '', isCorrect: false }
  ])
  const [matchingPairs, setMatchingPairs] = useState<Array<{left: string, right: string}>>([])
  const [shortAnswers, setShortAnswers] = useState<string[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [previewMode, setPreviewMode] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_type: 'multiple_choice',
      difficulty_level: 'medium',
      points: 1,
      year: new Date().getFullYear(),
      semester: 'ganjil'
    }
  })

  useEffect(() => {
    fetchSubjects()
    fetchClasses()
  }, [])

  const fetchSubjects = async () => {
    const { data } = await supabaseService.getSubjects()
    setSubjects(data || [])
  }

  const fetchClasses = async () => {
    const { data } = await supabaseService.getClasses()
    setClasses(data || [])
  }

  const handleAddOption = () => {
    setOptions([...options, { 
      id: Date.now().toString(), 
      text: '', 
      isCorrect: false 
    }])
  }

  const handleOptionChange = (id: string, field: string, value: any) => {
    setOptions(options.map(opt => 
      opt.id === id ? { ...opt, [field]: value } : opt
    ))
  }

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id))
  }

  const handleAddMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { left: '', right: '' }])
  }

  const handleMatchingPairChange = (index: number, field: 'left' | 'right', value: string) => {
    const newPairs = [...matchingPairs]
    newPairs[index][field] = value
    setMatchingPairs(newPairs)
  }

  const handleRemoveMatchingPair = (index: number) => {
    setMatchingPairs(matchingPairs.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: QuestionFormData) => {
    try {
      // Save question
      const questionData = {
        ...data,
        created_by: (await supabaseService.getCurrentUser())?.id
      }

      const { data: question, error } = await supabaseService.createQuestion(questionData)
      
      if (error) throw error

      // Save options if multiple choice/select
      if (['multiple_choice', 'multiple_select'].includes(questionType)) {
        for (const option of options) {
          await supabaseService.createQuestionOption({
            question_id: question.id,
            option_text: option.text,
            is_correct: option.isCorrect,
            sort_order: options.indexOf(option)
          })
        }
      }

      // Save matching pairs if matching type
      if (questionType === 'matching') {
        for (const pair of matchingPairs) {
          await supabaseService.createMatchingPair({
            question_id: question.id,
            left_item: pair.left,
            right_item: pair.right,
            sort_order: matchingPairs.indexOf(pair)
          })
        }
      }

      // Save short answer keys if short answer type
      if (questionType === 'short_answer') {
        for (const answer of shortAnswers) {
          await supabaseService.createShortAnswerKey({
            question_id: question.id,
            correct_answer: answer,
            is_case_sensitive: false
          })
        }
      }

      toast.success('Soal berhasil disimpan!')
      resetForm()
    } catch (error) {
      toast.error('Gagal menyimpan soal')
      console.error(error)
    }
  }

  const resetForm = () => {
    setOptions([
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false }
    ])
    setMatchingPairs([])
    setShortAnswers([])
  }

  const renderQuestionTypeContent = () => {
    switch (questionType) {
      case 'multiple_choice':
      case 'multiple_select':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Opsi Jawaban</h4>
              <Button type="button" onClick={handleAddOption} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Opsi
              </Button>
            </div>
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <Label>Opsi {String.fromCharCode(65 + index)}</Label>
                  <RichTextEditor
                    value={option.text}
                    onChange={(value) => handleOptionChange(option.id, 'text', value)}
                    placeholder="Masukkan teks opsi..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => handleOptionChange(option.id, 'isCorrect', checked)}
                  />
                  <Label>Jawaban Benar</Label>
                </div>
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveOption(option.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )

      case 'matching':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Pasangan Menjodohkan</h4>
              <Button type="button" onClick={handleAddMatchingPair} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pasangan
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-4 mb-2 font-medium">
              <div className="col-span-5">Item Kiri</div>
              <div className="col-span-1"></div>
              <div className="col-span-5">Item Kanan</div>
              <div className="col-span-1">Aksi</div>
            </div>
            {matchingPairs.map((pair, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5">
                  <Input
                    value={pair.left}
                    onChange={(e) => handleMatchingPairChange(index, 'left', e.target.value)}
                    placeholder="Masukkan item kiri..."
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <MoveRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="col-span-5">
                  <Input
                    value={pair.right}
                    onChange={(e) => handleMatchingPairChange(index, 'right', e.target.value)}
                    placeholder="Masukkan item kanan..."
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMatchingPair(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )

      case 'short_answer':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Kunci Jawaban</h4>
            {shortAnswers.map((answer, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={answer}
                  onChange={(e) => {
                    const newAnswers = [...shortAnswers]
                    newAnswers[index] = e.target.value
                    setShortAnswers(newAnswers)
                  }}
                  placeholder="Masukkan jawaban yang benar..."
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setShortAnswers(shortAnswers.filter((_, i) => i !== index))
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => setShortAnswers([...shortAnswers, ''])}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jawaban
            </Button>
          </div>
        )

      case 'essay':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Soal uraian akan dinilai secara manual oleh guru.
                Pastikan instruksi penilaian jelas pada bagian pembahasan.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Editor Soal AKM</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={previewMode ? "default" : "outline"}
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button type="submit" form="question-form">
                <Save className="w-4 h-4 mr-2" />
                Simpan Soal
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previewMode ? (
            <div className="space-y-6">
              {/* Preview content will be rendered here */}
              <div className="border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">Preview Soal</h3>
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: watch('question_text') }} />
                </div>
              </div>
            </div>
          ) : (
            <form id="question-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="question">Soal</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="content">Konten</TabsTrigger>
                  <TabsTrigger value="attachment">Lampiran</TabsTrigger>
                </TabsList>

                <TabsContent value="question" className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="question_type">Tipe Soal</Label>
                      <Select
                        value={questionType}
                        onValueChange={(value) => {
                          setQuestionType(value)
                          setValue('question_type', value as any)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe soal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                          <SelectItem value="multiple_select">Pilihan Ganda Kompleks</SelectItem>
                          <SelectItem value="matching">Menjodohkan</SelectItem>
                          <SelectItem value="short_answer">Isian Singkat</SelectItem>
                          <SelectItem value="essay">Uraian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="difficulty_level">Tingkat Kesulitan</Label>
                      <Select {...register('difficulty_level')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tingkat kesulitan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Mudah</SelectItem>
                          <SelectItem value="medium">Sedang</SelectItem>
                          <SelectItem value="hard">Sulit</SelectItem>
                          <SelectItem value="challenging">Sangat Sulit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="stimulus">Stimulus</Label>
                    <RichTextEditor
                      value={watch('stimulus')}
                      onChange={(value) => setValue('stimulus', value)}
                      placeholder="Masukkan stimulus atau teks pengantar..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="question_text">Pertanyaan *</Label>
                    <RichTextEditor
                      value={watch('question_text')}
                      onChange={(value) => setValue('question_text', value)}
                      placeholder="Masukkan pertanyaan..."
                      error={errors.question_text?.message}
                    />
                  </div>

                  {renderQuestionTypeContent()}
                </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject_id">Mata Pelajaran</Label>
                      <Select {...register('subject_id')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih mata pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="class_id">Kelas</Label>
                      <Select {...register('class_id')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kelas" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year">Tahun</Label>
                      <Input type="number" {...register('year', { valueAsNumber: true })} />
                    </div>
                    <div>
                      <Label htmlFor="semester">Semester</Label>
                      <Select {...register('semester')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ganjil">Ganjil</SelectItem>
                          <SelectItem value="genap">Genap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="kd_cp">KD/CP</Label>
                    <Input {...register('kd_cp')} placeholder="Kompetensi Dasar/Capaian Pembelajaran" />
                  </div>

                  <div>
                    <Label htmlFor="material">Materi</Label>
                    <Input {...register('material')} placeholder="Materi pembelajaran" />
                  </div>

                  <div>
                    <Label htmlFor="indicator">Indikator</Label>
                    <Input {...register('indicator')} placeholder="Indikator pencapaian" />
                  </div>

                  <div>
                    <Label htmlFor="cognitive_level">Level Kognitif</Label>
                    <Input {...register('cognitive_level')} placeholder="C1-C6 (Remembering, Understanding, etc.)" />
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label htmlFor="explanation">Pembahasan</Label>
                    <RichTextEditor
                      value={watch('explanation')}
                      onChange={(value) => setValue('explanation', value)}
                      placeholder="Masukkan pembahasan soal..."
                    />
                  </div>

                  <div>
                    <Label>Input Matematika</Label>
                    <MathInput
                      onInsert={(latex) => {
                        // Insert LaTeX into current editor
                        const currentValue = watch('question_text') || ''
                        setValue('question_text', currentValue + `$${latex}$`)
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="attachment" className="space-y-4">
                  <FileUpload
                    accept="image/*,audio/*,video/*"
                    maxSize={10 * 1024 * 1024} // 10MB
                    onUpload={(files) => {
                      // Handle file uploads
                      console.log('Uploaded files:', files)
                    }}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 text-center">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Gambar</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, GIF</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <Film className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Video</p>
                      <p className="text-xs text-muted-foreground">MP4, AVI, MOV</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <Music className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Audio</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, OGG</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default QuestionEditor
