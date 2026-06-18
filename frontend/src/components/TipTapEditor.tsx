'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[35vh] max-h-[50vh] overflow-y-auto p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap',
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[35vh] text-xs text-slate-500">
        Loading Space Editor...
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
      
      {/* Editor Formatting Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-white/5 border-b border-white/5 text-xs">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2.5 py-1.5 rounded font-bold transition hover:bg-white/10 ${editor.isActive('bold') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1.5 rounded italic transition hover:bg-white/10 ${editor.isActive('italic') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-2.5 py-1.5 rounded line-through transition hover:bg-white/10 ${editor.isActive('strike') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`px-2.5 py-1.5 rounded font-mono transition hover:bg-white/10 ${editor.isActive('code') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          Code
        </button>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1 align-middle self-center" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          H3
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1 align-middle self-center" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          1. List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1.5 rounded transition hover:bg-white/10 ${editor.isActive('codeBlock') ? 'bg-purple-600/40 text-teal-300 border border-purple-500/20' : 'text-slate-300'}`}
        >
          Block
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1 align-middle self-center" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="px-2 py-1.5 rounded text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="px-2 py-1.5 rounded text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          Redo
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />

    </div>
  );
}
