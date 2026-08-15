'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, SeparatorHorizontal, Underline as UnderlineIcon, Undo2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface EditorDocument { type: 'doc'; content?: unknown[] }

interface RichEditorProps {
  initialContent: unknown;
  onChange: (json: EditorDocument, text: string) => void;
}

export function RichEditor({ initialContent, onChange }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline, Typography, Image.configure({ allowBase64: false }), Link.configure({ openOnClick: false }), TextAlign.configure({ types: ['heading', 'paragraph'] }), Placeholder.configure({ placeholder: 'Empieza a escribir tu historia...' })],
    content: normalizeContent(initialContent),
    editorProps: { attributes: { class: 'prose-editor' } },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as EditorDocument, current.getText({ blockSeparator: '\n\n' })),
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  const addImage = useCallback(async (file: File) => {
    if (!editor) return;
    const intent = await apiFetch<{ mediaId: string; uploadUrl: string; publicUrl: string; headers: Record<string,string> }>('/v1/media/upload-intent', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size, purpose: 'chapter' }) });
    const upload = await fetch(intent.uploadUrl, { method: 'PUT', headers: intent.headers, body: file });
    if (!upload.ok) throw new Error('No pudimos subir la imagen.');
    const confirmed = await apiFetch<{ publicUrl: string }>(`/v1/media/${intent.mediaId}/confirm`, { method: 'POST' });
    editor.chain().focus().setImage({ src: confirmed.publicUrl, alt: file.name }).run();
  }, [editor]);

  if (!editor) return <div className="editor-loading">Preparando editor...</div>;
  const command = (label: string, icon: React.ReactNode, action: () => void, active = false) => <button type="button" title={label} className={active ? 'active' : ''} onClick={action}>{icon}</button>;
  return <div className="editor-surface"><div className="editor-toolbar">
    {command('Deshacer', <Undo2 size={17}/>, () => editor.chain().focus().undo().run())}
    {command('Rehacer', <Redo2 size={17}/>, () => editor.chain().focus().redo().run())}<i />
    {command('Titulo', <Heading2 size={17}/>, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading',{level:2}))}
    {command('Negrita', <Bold size={17}/>, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
    {command('Cursiva', <Italic size={17}/>, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
    {command('Subrayado', <UnderlineIcon size={17}/>, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}<i />
    {command('Lista', <List size={17}/>, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
    {command('Lista numerada', <ListOrdered size={17}/>, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
    {command('Cita', <Quote size={17}/>, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
    {command('Separador', <SeparatorHorizontal size={17}/>, () => editor.chain().focus().setHorizontalRule().run())}<i />
    {command('Alinear izquierda', <AlignLeft size={17}/>, () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({textAlign:'left'}))}
    {command('Centrar', <AlignCenter size={17}/>, () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({textAlign:'center'}))}
    {command('Alinear derecha', <AlignRight size={17}/>, () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({textAlign:'right'}))}<i />
    {command('Enlace', <Link2 size={17}/>, () => { const href=window.prompt('URL del enlace'); if(href) editor.chain().focus().extendMarkRange('link').setLink({href}).run(); }, editor.isActive('link'))}
    {command('Imagen', <ImagePlus size={17}/>, () => fileRef.current?.click())}
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file=event.target.files?.[0]; if(file) void addImage(file); event.target.value=''; }} />
  </div><EditorContent editor={editor}/></div>;
}

function normalizeContent(content: unknown): JSONContent {
  if (content && typeof content === 'object' && 'type' in content && typeof (content as { type?: unknown }).type === 'string') return content as JSONContent;
  const paragraphs = Array.isArray(content) ? content.map(String) : [String(content ?? '')];
  return { type: 'doc', content: paragraphs.filter(Boolean).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) };
}
