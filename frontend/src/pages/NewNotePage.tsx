import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createNote, getNote, listNotes, setNoteTags, updateNote } from "../api/notes";
import { createTag, listTags } from "../api/tags";
import { useToast } from "../components/ui";
import { NotesSidebar } from "./notes-shared";

type SelectedTag = {
  id: number;
  name: string;
};

export function NewNotePage() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const parsedEditNoteId = useMemo(() => {
    if (!noteId) return null;
    const parsed = Number(noteId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [noteId]);
  const isEditMode = parsedEditNoteId !== null;
  const initializedEditNoteIdRef = useRef<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(parsedEditNoteId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);

  useEffect(() => {
    if (parsedEditNoteId !== null) {
      setSelectedNoteId(parsedEditNoteId);
    }
  }, [parsedEditNoteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  const notesQuery = useQuery({
    queryKey: ["notes", { archived: false, search: debouncedSearch }],
    queryFn: () => listNotes({ archived: false, search: debouncedSearch || undefined }),
  });
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });
  const editNoteQuery = useQuery({
    queryKey: ["note", parsedEditNoteId],
    queryFn: () => getNote(parsedEditNoteId as number),
    enabled: isEditMode,
    retry: false,
  });

  const notes = notesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

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

  useEffect(() => {
    if (!isEditMode) {
      initializedEditNoteIdRef.current = null;
      return;
    }
    const note = editNoteQuery.data;
    if (!note) return;
    if (initializedEditNoteIdRef.current === note.id) return;
    setTitle(note.title ?? "");
    setContent(note.content ?? "");
    setSelectedTags(note.tags.map((tag) => ({ id: tag.id, name: tag.name })));
    setTagInput("");
    initializedEditNoteIdRef.current = note.id;
  }, [editNoteQuery.data, isEditMode]);

  const tagSuggestions = useMemo(() => {
    const keyword = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (!keyword) return [];
    return tags
      .filter((tag) => tag.name.toLowerCase().includes(keyword))
      .filter((tag) => !selectedTags.some((selected) => selected.id === tag.id))
      .slice(0, 6);
  }, [tagInput, tags, selectedTags]);

  const canSave = content.trim().length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedContent = content.trim();
      if (!normalizedContent) {
        throw new Error("content_required");
      }
      if (isEditMode && parsedEditNoteId !== null) {
        await updateNote(parsedEditNoteId, {
          title: title.trim() || null,
          content: normalizedContent,
        });
        await setNoteTags(
          parsedEditNoteId,
          selectedTags.map((tag) => tag.id),
        );
        return parsedEditNoteId;
      }
      const created = await createNote({
        title: title.trim() || null,
        content: normalizedContent,
      });
      if (selectedTags.length > 0) {
        await setNoteTags(
          created.id,
          selectedTags.map((tag) => tag.id),
        );
      }
      return created.id;
    },
    onSuccess: (savedNoteId) => {
      showToast(isEditMode ? "笔记已更新" : "笔记已保存", "success");
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (isEditMode) {
        void queryClient.invalidateQueries({ queryKey: ["note", savedNoteId] });
      }
      navigate(`/notes?noteId=${savedNoteId}`, { replace: true });
    },
    onError: () => showToast(isEditMode ? "更新失败，请稍后重试" : "保存失败，请稍后重试", "error"),
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => createTag({ name, color: null }),
    onSuccess: (tag) => {
      setSelectedTags((prev) => [...prev, { id: tag.id, name: tag.name }]);
      setTagInput("");
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      showToast(`标签 #${tag.name} 已创建`, "success");
    },
    onError: () => showToast("创建标签失败，名称可能已存在", "error"),
  });

  const pickTag = (tag: { id: number; name: string }) => {
    if (selectedTags.some((selected) => selected.id === tag.id)) {
      setTagInput("");
      return;
    }
    setSelectedTags((prev) => [...prev, { id: tag.id, name: tag.name }]);
    setTagInput("");
  };

  const onTagInputEnter = () => {
    const keyword = tagInput.trim().replace(/^#/, "");
    if (!keyword) return;
    const existing = tags.find((tag) => tag.name.toLowerCase() === keyword.toLowerCase());
    if (existing) {
      pickTag(existing);
      return;
    }
    createTagMutation.mutate(keyword);
  };

  const resetForm = () => {
    if (isEditMode && editNoteQuery.data) {
      setTitle(editNoteQuery.data.title ?? "");
      setContent(editNoteQuery.data.content ?? "");
      setSelectedTags(editNoteQuery.data.tags.map((tag) => ({ id: tag.id, name: tag.name })));
      setTagInput("");
      return;
    }
    setTitle("");
    setContent("");
    setTagInput("");
    setSelectedTags([]);
  };

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">{isEditMode ? "编辑笔记" : "新建笔记"}</h1>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-[10px] bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
          onClick={() => navigate("/notes")}
          type="button"
        >
          返回列表
        </button>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-4">
        <NotesSidebar
          loading={notesQuery.isLoading}
          notes={notes}
          onOpenEdit={(id) => navigate(`/notes/${id}/edit`)}
          onOpenReminder={(noteId) => navigate(`/reminders?noteId=${noteId}`)}
          onSearchChange={setSearch}
          onSelect={setSelectedNoteId}
          search={search}
          selectedNoteId={resolvedSelectedNoteId}
        />

        <article className="flex min-h-0 flex-col gap-[14px] rounded-[14px] border border-[#E2E8F0] bg-white p-4">
          {isEditMode && editNoteQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#64748B]">正在加载笔记内容...</div>
          ) : null}
          {isEditMode && editNoteQuery.isError ? (
            <div className="flex h-full items-center justify-center text-sm text-[#B91C1C]">笔记不存在或已被删除</div>
          ) : null}
          {!isEditMode || (!editNoteQuery.isLoading && !editNoteQuery.isError) ? (
            <>
          <div className="space-y-1">
            <h2 className="text-[20px] font-bold text-[#0F172A]">{isEditMode ? "继续编辑" : "开始撰写"}</h2>
            <p className="text-[13px] text-[#64748B]">
              {isEditMode ? "修改标题、标签与正文，保存后覆盖原内容" : "填写标题、标签与正文，支持自动保存草稿"}
            </p>
          </div>

          <div className="space-y-[14px]">
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-[#475569]">标题</p>
              <input
                className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：产品需求评审"
                value={title}
              />
            </div>

            <div className="relative space-y-1.5">
              <p className="text-[13px] font-semibold text-[#475569]">标签</p>
              <input
                className="h-9 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onTagInputEnter();
                  }
                }}
                placeholder="#输入标签名"
                value={tagInput}
              />
              {tagSuggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[74px] z-20 rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-md">
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      className="block h-8 w-full rounded px-2 text-left text-sm text-[#334155] hover:bg-[#EFF6FF]"
                      onClick={() => pickTag(tag)}
                      type="button"
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="inline-flex items-center rounded-full bg-[#DBEAFE] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]"
                      onClick={() => setSelectedTags((prev) => prev.filter((item) => item.id !== tag.id))}
                      type="button"
                    >
                      #{tag.name} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-[#475569]">正文</p>
              <textarea
                className="h-[220px] w-full resize-none rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-sm leading-6 text-[#334155] outline-none focus:border-[#60A5FA]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="输入你的想法..."
                value={content}
              />
            </div>
          </div>

          <div className="mt-auto flex h-10 items-center justify-end gap-3">
            <button
              className="inline-flex h-10 w-24 items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-[#F1F5F9] text-sm text-[#334155] transition hover:bg-[#E2E8F0]"
              onClick={resetForm}
              type="button"
            >
              取消
            </button>
            <button
              className="inline-flex h-10 w-24 items-center justify-center rounded-[10px] bg-[#2563EB] text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
              disabled={saveMutation.isPending || !canSave}
              onClick={() => saveMutation.mutate()}
              type="button"
            >
              {isEditMode ? "保存修改" : "保存"}
            </button>
          </div>
            </>
          ) : null}
        </article>
      </section>
    </div>
  );
}
