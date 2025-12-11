import React, { useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import MathExtension from '@tiptap/extension-math'
import { cn } from '../../lib/utils'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Highlighter,
  Link as LinkIcon,
  Sigma,
  Image as ImageIcon,
  Code,
  Quote,
  Undo,
  Redo,
  Type
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/Dialog'
import 'katex/dist/katex.min.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  minHeight?: string
  readOnly?: boolean
}

const MathDialog: React.FC<{
  onInsert: (latex: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ onInsert, open, onOpenChange }) => {
  const [latex, setLatex] = useState('')

  const handleInsert = () => {
    if (latex.trim()) {
      onInsert(latex)
      setLatex('')
      onOpenChange(false)
    }
  }

  const examples = [
    'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    '\\int_a^b f(x) dx = F(b) - F(a)',
    '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}',
    '\\lim_{x \\to \\infty} \\frac{1}{x} = 0',
    '\\sin^2 \\theta + \\cos^2 \\theta = 1',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Matematika (LaTeX)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="Masukkan ekspresi LaTeX..."
          />
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Contoh:</p>
            <div className="grid grid-cols-1 gap-2">
              {examples.map((example, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => setLatex(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleInsert}
            >
              Insert
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Ketik di sini...',
  error,
  minHeight = '200px',
  readOnly = false
}) => {
  const [mathDialogOpen, setMathDialogOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false
        }
      }),
      Underline,
      TextStyle,
      Color,
      Superscript,
      Subscript,
      Highlight.configure({
        multicolor: true
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: true,
        autolink: true
      }),
      Placeholder.configure({
        placeholder
      }),
      MathExtension.configure({
        evaluation: true,
        addInlineMathBlock: true,
        inlineMathClassName: 'math-inline',
        blockMathClassName: 'math-block'
      })
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
          'prose-headings:mt-3 prose-headings:mb-2',
          'prose-p:my-2 prose-li:my-1',
          'prose-strong:font-bold prose-em:italic',
          'prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted',
          'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic'
        )
      }
    }
  })

  const addImage = useCallback(() => {
    if (!editor) return
    
    const url = window.prompt('URL Gambar')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const insertMath = useCallback((latex: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(`$${latex}$`).run()
  }, [editor])

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-background">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive('bold') && 'bg-muted')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive('italic') && 'bg-muted')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(editor.isActive('underline') && 'bg-muted')}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
            title="Heading 1"
          >
            H1
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
            title="Heading 2"
          >
            H2
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(editor.isActive('heading', { level: 3 }) && 'bg-muted')}
            title="Heading 3"
          >
            H3
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(editor.isActive('bulletList') && 'bg-muted')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(editor.isActive('orderedList') && 'bg-muted')}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-muted')}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-muted')}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-muted')}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={cn(editor.isActive({ textAlign: 'justify' }) && 'bg-muted')}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={cn(editor.isActive('superscript') && 'bg-muted')}
            title="Superscript"
          >
            <SuperscriptIcon className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={cn(editor.isActive('subscript') && 'bg-muted')}
            title="Subscript"
          >
            <SubscriptIcon className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(editor.isActive('highlight') && 'bg-muted')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn(editor.isActive('link') && 'bg-muted')}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(editor.isActive('code') && 'bg-muted')}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(editor.isActive('blockquote') && 'bg-muted')}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addImage}
            title="Image"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>

          <Dialog open={mathDialogOpen} onOpenChange={setMathDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Math Equation"
              >
                <Sigma className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <MathDialog 
              onInsert={insertMath} 
              open={mathDialogOpen} 
              onOpenChange={setMathDialogOpen} 
            />
          </Dialog>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div 
        className={cn(
          'border rounded-lg overflow-hidden bg-background',
          error && 'border-destructive',
          readOnly && 'bg-muted/30'
        )}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
        
        {!readOnly && editor && (
          <>
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 100 }}
              className="flex gap-1 p-1 bg-background border rounded-lg shadow-lg"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(editor.isActive('bold') && 'bg-muted')}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(editor.isActive('italic') && 'bg-muted')}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn(editor.isActive('underline') && 'bg-muted')}
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={setLink}
                className={cn(editor.isActive('link') && 'bg-muted')}
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </BubbleMenu>

            <FloatingMenu
              editor={editor}
              tippyOptions={{ duration: 100 }}
              className="flex gap-1 p-1 bg-background border rounded-lg shadow-lg"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
              >
                H1
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
              >
                H2
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(editor.isActive('bulletList') && 'bg-muted')}
              >
                <List className="w-4 h-4" />
              </Button>
            </FloatingMenu>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export default RichTextEditor
