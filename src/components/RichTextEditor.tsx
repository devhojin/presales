'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
// StarterKit 이 Link, Underline 을 이미 포함하므로 별도 import 제거 (중복 extension 경고 방지)
import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Minus, Undo, Redo, Code, ImageIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({ onClick, active, children, title }: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors cursor-pointer ${active ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const uploadImage = useCallback(async (file: File) => {
    const ed = editorRef.current
    if (!ed || uploadingRef.current) return
    uploadingRef.current = true
    try {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.')
        return
      }
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const fileName = `blog/inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('product-thumbnails').upload(fileName, file)
      if (error) {
        alert('이미지 업로드 실패: ' + error.message)
        return
      }
      const { data: urlData } = supabase.storage.from('product-thumbnails').getPublicUrl(fileName)
      ed.chain().focus().setImage({ src: urlData.publicUrl }).run()
    } finally {
      uploadingRef.current = false
    }
  }, [])

  const editor = useEditor({
    // Tiptap v3 + Next.js SSR 필수: immediatelyRender=false 없으면 hydration mismatch 로 전체 페이지 에러 바운더리 폴백
    immediatelyRender: false,
    extensions: [
      // StarterKit 의 기본 Link 설정을 override 하기 위해 StarterKit 의 link 비활성화 + 별도 configure
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || '내용을 입력하세요...' }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) uploadImage(file)
            return true
          }
        }
        return false
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            uploadImage(file)
            return true
          }
        }
        return false
      },
    },
  })

  // editorRef를 항상 최신 editor 인스턴스로 유지
  editorRef.current = editor

  if (!editor) return null

  const addLink = () => {
    const url = prompt('URL을 입력하세요:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="제목3">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="링크">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="이미지 삽입">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드블록">
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="실행 취소">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadImage(file)
          e.target.value = ''
        }}
      />

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="min-h-[400px] p-4 product-description [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[380px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-4"
      />
    </div>
  )
}
