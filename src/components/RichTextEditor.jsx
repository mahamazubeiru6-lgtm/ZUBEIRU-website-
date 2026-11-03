import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Minus,
  RemoveFormatting,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";


export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write a description…",
  minHeight = 220,
}) {
  const { colors } = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "rt-editor-content",
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && next !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(next || "", false);
    }
  }, [value]);

  if (!editor) {
    return <div style={{ minHeight, background: colors.hoverBg, borderRadius: 12 }} />;
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        overflow: "hidden",
        background: colors.raisedBg,
      }}
    >
      <Toolbar editor={editor} colors={colors} />
      <EditorContent editor={editor} />
      <style>{`
        .rt-editor-content {
          padding: 14px 16px;
          font-size: 14.5px;
          line-height: 1.7;
          color: ${colors.text};
          outline: none;
        }
        .rt-editor-content p { margin: 0 0 12px; }
        .rt-editor-content p:last-child { margin-bottom: 0; }
        .rt-editor-content h2 {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.01em;
          margin: 22px 0 10px;
        }
        .rt-editor-content h2:first-child { margin-top: 0; }
        .rt-editor-content h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 18px 0 8px;
        }
        .rt-editor-content h3:first-child { margin-top: 0; }
        .rt-editor-content h4 {
          font-size: 14.5px;
          font-weight: 700;
          margin: 16px 0 6px;
        }
        .rt-editor-content h4:first-child { margin-top: 0; }
        .rt-editor-content ul,
        .rt-editor-content ol { margin: 0 0 12px; padding-left: 22px; }
        .rt-editor-content li { margin-bottom: 4px; }
        .rt-editor-content blockquote {
          margin: 14px 0;
          padding: 10px 16px;
          border-left: 3px solid ${colors.border};
          color: ${colors.secondaryText};
          font-style: italic;
        }
        .rt-editor-content code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em;
          padding: 1px 5px;
          border-radius: 5px;
          background: ${colors.hoverBg};
        }
        .rt-editor-content a {
          color: ${colors.btnBg};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .rt-editor-content hr {
          border: none;
          border-top: 1px solid ${colors.border};
          margin: 18px 0;
        }
        .rt-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${colors.secondaryText};
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}


const Toolbar = ({ editor, colors }) => {
  const setLink = () => {
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL", previous);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
  };

  const Btn = ({ onClick, active, disabled, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: 6,
        border: "none",
        background: active ? colors.hoverBg : "transparent",
        color: active ? colors.btnBg : disabled ? colors.secondaryText : colors.text,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.12s ease, color 0.12s ease",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span
      style={{
        width: 1,
        height: 18,
        background: colors.separator || colors.border,
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
        padding: "6px 8px",
        borderBottom: `1px solid ${colors.border}`,
        background: colors.subtleBg || colors.hoverBg,
      }}
    >
      <Btn
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <Bold size={15} />
      </Btn>
      <Btn
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <Italic size={15} />
      </Btn>
      <Btn
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        <Strikethrough size={15} />
      </Btn>
      <Btn
        title="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
      >
        <Code size={15} />
      </Btn>

      <Divider />

      <Btn
        title="Heading 2"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 size={15} />
      </Btn>
      <Btn
        title="Heading 3"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        active={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 size={15} />
      </Btn>

      <Divider />

      <Btn
        title="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        <List size={15} />
      </Btn>
      <Btn
        title="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        <ListOrdered size={15} />
      </Btn>
      <Btn
        title="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
      >
        <Quote size={15} />
      </Btn>
      <Btn
        title="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={15} />
      </Btn>

      <Divider />

      <Btn
        title="Add link"
        onClick={setLink}
        active={editor.isActive("link")}
      >
        <LinkIcon size={15} />
      </Btn>
      <Btn
        title="Clear formatting"
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
      >
        <RemoveFormatting size={15} />
      </Btn>

      <div style={{ flex: 1 }} />

      <Btn
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 size={15} />
      </Btn>
      <Btn
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 size={15} />
      </Btn>
    </div>
  );
};

