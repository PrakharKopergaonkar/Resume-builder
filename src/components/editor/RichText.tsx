"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

/** Small rich-text editor (bold, italic, bullet/numbered lists) that emits HTML. */
export function RichText({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: { attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Sync external changes (undo/redo, switching resumes) without clobbering the cursor while typing.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
    }),
  });

  const btn = (on: boolean | undefined) =>
    `h-7 min-w-7 rounded px-1.5 text-sm ${on ? "bg-blue-100 text-blue-800" : "text-neutral-600 hover:bg-neutral-100"}`;

  return (
    <div className="rich-editor rounded-md border border-neutral-300 bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
      <div className="flex gap-1 border-b border-neutral-200 px-1.5 py-1" role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" className={`${btn(active?.bold)} font-bold`} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold" aria-pressed={active?.bold}>
          B
        </button>
        <button type="button" className={`${btn(active?.italic)} italic`} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic" aria-pressed={active?.italic}>
          I
        </button>
        <button type="button" className={btn(active?.bullet)} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Bullet list" aria-pressed={active?.bullet}>
          • List
        </button>
        <button type="button" className={btn(active?.ordered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="Numbered list" aria-pressed={active?.ordered}>
          1. List
        </button>
      </div>
      <EditorContent editor={editor} className="text-sm" />
    </div>
  );
}
