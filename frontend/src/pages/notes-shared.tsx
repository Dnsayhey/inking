import { useEffect, useRef, useState } from "react";
import { Link2, Pencil } from "lucide-react";

import { Note } from "../api/notes";

function formatUpdatedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type NotesSidebarProps = {
  notes: Note[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedNoteId: number | null;
  onSelect: (noteId: number) => void;
  loading: boolean;
  onOpenReminder?: (noteId: number) => void;
  onOpenEdit?: (noteId: number) => void;
};

export function NotesSidebar({
  notes,
  search,
  onSearchChange,
  selectedNoteId,
  onSelect,
  loading,
  onOpenReminder,
  onOpenEdit,
}: NotesSidebarProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleListScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
      scrollTimeoutRef.current = null;
    }, 700);
  };

  return (
    <aside className="flex min-h-0 flex-col rounded-[14px] border border-[#E2E8F0] bg-white p-3">
      <input
        className="h-10 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="搜索笔记..."
        value={search}
      />
      <div
        className={`notes-list-scrollbar mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto -mr-2 ${
          isScrolling ? "is-scrolling" : ""
        }`}
        onScroll={handleListScroll}
      >
        {loading ? <p className="px-1 py-2 text-sm text-[#64748B]">正在加载...</p> : null}
        {!loading && notes.length === 0 ? <p className="px-1 py-2 text-sm text-[#64748B]">暂无笔记</p> : null}
        {notes.map((note) => {
          const active = note.id === selectedNoteId;
          const tagLine = note.tags.length > 0 ? note.tags.map((tag) => `#${tag.name}`).join(" ") : "无标签";
          return (
            <div key={note.id} className="group relative h-[88px]">
              <button
                className={`h-full w-full rounded-[10px] p-[10px] text-left transition ${
                  active
                    ? "border border-[#DBEAFE] bg-[#EFF6FF] group-hover:pr-[72px]"
                    : "border border-transparent bg-[#F8FAFC] hover:bg-[#F1F5F9] group-hover:pr-[72px]"
                }`}
                onClick={() => onSelect(note.id)}
                type="button"
              >
                <p className={`truncate text-[15px] font-semibold ${active ? "text-[#1E3A8A]" : "text-[#0F172A]"}`}>
                  {note.title || "无标题"}
                </p>
                <p className={`mt-1 truncate text-xs ${active ? "text-[#475569]" : "text-[#64748B]"}`}>
                  {formatUpdatedAt(note.updated_at)}
                </p>
                <p className={`mt-1 truncate text-xs ${active ? "text-[#475569]" : "text-[#64748B]"}`}>
                  {tagLine}
                </p>
              </button>
              <div className="pointer-events-none absolute right-2 top-2 flex h-7 items-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#BFDBFE] bg-white/80 text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenEdit?.(note.id);
                  }}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#BFDBFE] bg-white/80 text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenReminder?.(note.id);
                  }}
                  type="button"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
