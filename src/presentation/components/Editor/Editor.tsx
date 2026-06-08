import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';

export interface EditorChangePayload {
  contentJson: unknown;
  plainText: string;
}

interface EditorProps {
  initialContent: unknown;
  onChange: (p: EditorChangePayload) => void;
  placeholder?: string;
}

export function Editor({ initialContent, onChange, placeholder }: EditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? '今天，发生了什么？' }),
      Image.configure({ inline: false }),
      TaskList.configure({ HTMLAttributes: { class: 'quiet-task-list' } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: 'quiet-task-item' } }),
    ],
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class:
          'prose-quiet focus:outline-none min-h-[40vh] text-[15px] leading-7 text-ink',
        'data-testid': 'editor-content',
      },
    },
    onUpdate({ editor }) {
      onChangeRef.current({
        contentJson: editor.getJSON(),
        plainText: editor.getText(),
      });
    },
  });

  // 切换条目时切换内容
  useEffect(() => {
    if (!editor) return;
    if (initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(initialContent as Parameters<typeof editor.commands.setContent>[0]);
    }
  }, [initialContent, editor]);

  return (
    <>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
}
