import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolItem {
  label: string;
  hint: string;
  isActive?: () => boolean;
  run: () => void;
}

type ListKind = 'bulletList' | 'orderedList' | 'taskList';
const TOGGLE_CMD: Record<
  ListKind,
  'toggleBulletList' | 'toggleOrderedList' | 'toggleTaskList'
> = {
  bulletList: 'toggleBulletList',
  orderedList: 'toggleOrderedList',
  taskList: 'toggleTaskList',
};

/**
 * 在 bulletList / orderedList / taskList 三种列表之间互转。
 * Tiptap 自带的 toggleXxxList 只关心是否在自家列表中，跨列表切换无法直接工作。
 *  - 已在目标列表中：执行 toggle（退出列表，回到段落）
 *  - 在另一种列表中：先退出当前，再进入目标（chain 一气呵成）
 *  - 不在任何列表中：直接进入目标
 */
function switchList(editor: Editor, target: ListKind): void {
  const KINDS = ['bulletList', 'orderedList', 'taskList'] as const;
  const current = KINDS.find((k) => editor.isActive(k));
  if (current === target) {
    editor.chain().focus()[TOGGLE_CMD[target]]().run();
    return;
  }
  if (current) {
    editor.chain().focus()[TOGGLE_CMD[current]]()[TOGGLE_CMD[target]]().run();
    return;
  }
  editor.chain().focus()[TOGGLE_CMD[target]]().run();
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const items: ToolItem[] = [
    {
      label: 'H1',
      hint: '一级标题',
      isActive: () => editor.isActive('heading', { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'H2',
      hint: '二级标题',
      isActive: () => editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'B',
      hint: '加粗',
      isActive: () => editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'I',
      hint: '斜体',
      isActive: () => editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: '“”',
      hint: '引用',
      isActive: () => editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '•',
      hint: '项目符号列表',
      isActive: () => editor.isActive('bulletList'),
      run: () => switchList(editor, 'bulletList'),
    },
    {
      label: '1.',
      hint: '编号列表',
      isActive: () => editor.isActive('orderedList'),
      run: () => switchList(editor, 'orderedList'),
    },
    {
      label: '☐',
      hint: '任务清单（可勾选）',
      isActive: () => editor.isActive('taskList'),
      run: () => switchList(editor, 'taskList'),
    },
    {
      label: '⌗',
      hint: '代码',
      isActive: () => editor.isActive('codeBlock'),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: '—',
      hint: '分割线',
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <div
      className="flex items-center gap-1 mb-6 -ml-1.5 select-none"
      data-testid="editor-toolbar"
      role="toolbar"
      aria-label="编辑器工具"
    >
      {items.map((it) => {
        const active = it.isActive?.() ?? false;
        return (
          <button
            key={it.label}
            type="button"
            onClick={it.run}
            title={it.hint}
            aria-label={it.hint}
            aria-pressed={active}
            className="inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs text-muted hover:text-ink transition-colors duration-quiet ease-quiet"
            style={{ background: active ? 'var(--accent-soft)' : 'transparent' }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
