import { useQuery } from "@tanstack/react-query";
import { Link2, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { listNotes } from "../api/notes";
import { NotesSidebar } from "./notes-shared";

export function NotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(() => {
    const raw = searchParams.get("noteId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  const notesQuery = useQuery({
    queryKey: ["notes", { archived: false, search: debouncedSearch }],
    queryFn: () => listNotes({ archived: false, search: debouncedSearch || undefined }),
  });

  const notes = notesQuery.data ?? [];

  const resolvedSelectedNoteId = useMemo(() => {
    if (notes.length === 0) return null;
    if (selectedNoteId && notes.some((note) => note.id === selectedNoteId)) {
      return selectedNoteId;
    }
    return notes[0].id;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (resolvedSelectedNoteId !== selectedNoteId) {
      setSelectedNoteId(resolvedSelectedNoteId);
    }
  }, [resolvedSelectedNoteId, selectedNoteId]);

  const selectedNote = useMemo(
    () => notes.find((item) => item.id === resolvedSelectedNoteId) ?? null,
    [notes, resolvedSelectedNoteId],
  );

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">笔记</h1>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-[10px] bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
          onClick={() => navigate("/notes/new")}
          type="button"
        >
          + 新建笔记
        </button>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-4">
        <NotesSidebar
          loading={notesQuery.isLoading}
          notes={notes}
          onOpenEdit={(noteId) => navigate(`/notes/${noteId}/edit`)}
          onOpenReminder={(noteId) => navigate(`/reminders?noteId=${noteId}`)}
          onSearchChange={setSearch}
          onSelect={setSelectedNoteId}
          search={search}
          selectedNoteId={resolvedSelectedNoteId}
        />

        <article className="relative flex min-h-0 flex-col rounded-[14px] border border-[#E2E8F0] bg-white p-4">
          {!selectedNote ? (
            <div className="flex h-full items-center justify-center text-sm text-[#64748B]">请选择一条笔记</div>
          ) : (
            <>
              <div className="absolute right-3 top-3 z-10 flex h-[30px] items-center gap-2 opacity-90">
                <button
                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E2E8F0] bg-white/80 text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-white"
                  onClick={() => navigate(`/notes/${selectedNote.id}/edit`)}
                  type="button"
                >
                  <Pencil className="h-[14px] w-[14px]" />
                </button>
                <button
                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E2E8F0] bg-white/80 text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition hover:bg-white"
                  onClick={() => navigate(`/reminders?noteId=${selectedNote.id}`)}
                  type="button"
                >
                  <Link2 className="h-[14px] w-[14px]" />
                </button>
              </div>
              <h2 className="text-[24px] font-bold text-[#0F172A]">{selectedNote.title || "无标题"}</h2>
              <p className="mt-2 text-[13px] font-semibold text-[#2563EB]">
                {selectedNote.tags.length > 0 ? selectedNote.tags.map((tag) => `#${tag.name}`).join("  ") : "无标签"}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.6] text-[#334155]">{selectedNote.content}</p>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
