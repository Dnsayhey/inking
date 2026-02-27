import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createNote, deleteNote, listNotes, setNoteTags, updateNote } from "../api/notes";
import { createTag, listTags } from "../api/tags";
import { FieldError, FormError, PrimaryButton, TextInput } from "../components/ui";

const noteSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
});

type NoteFormData = z.infer<typeof noteSchema>;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  return `${day} 天前`;
}

export function NotesPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isTagInputOpen, setIsTagInputOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [openMenuNoteId, setOpenMenuNoteId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [composerTagIds, setComposerTagIds] = useState<number[]>([]);
  const [isComposerTagPickerOpen, setIsComposerTagPickerOpen] = useState(false);
  const [composerTagKeyword, setComposerTagKeyword] = useState("");
  const composerTagPickerWrapRef = useRef<HTMLDivElement | null>(null);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });

  const notesQuery = useQuery({
    queryKey: ["notes", { search: debouncedSearchText, tagIds: selectedTagIds }],
    queryFn: () => listNotes({ archived: false, tagIds: selectedTagIds, search: debouncedSearchText || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: "" },
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      reset({ content: "" });
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: number; content: string }) => updateNote(noteId, { content }),
    onSuccess: async () => {
      setEditingNoteId(null);
      setOpenMenuNoteId(null);
      reset({ content: "" });
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const archiveNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const setTagsMutation = useMutation({
    mutationFn: ({ noteId, tagIds }: { noteId: number; tagIds: number[] }) => setNoteTags(noteId, tagIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      setNewTagName("");
      setIsTagInputOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const onCreateNote = async (data: NoteFormData) => {
    if (editingNoteId) {
      await updateNoteMutation.mutateAsync({ noteId: editingNoteId, content: data.content });
      await setTagsMutation.mutateAsync({ noteId: editingNoteId, tagIds: composerTagIds });
      return;
    }
    const created = await createNoteMutation.mutateAsync({ content: data.content });
    if (composerTagIds.length > 0) {
      await setTagsMutation.mutateAsync({ noteId: created.id, tagIds: composerTagIds });
    }
    setComposerTagIds([]);
    setComposerTagKeyword("");
    setIsComposerTagPickerOpen(false);
  };

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const onCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await createTagMutation.mutateAsync({ name });
    } catch {
      // error shown by status
    }
  };

  const onTagInputKeyDown: KeyboardEventHandler<HTMLInputElement> = async (e) => {
    const nativeEvent = e.nativeEvent as KeyboardEvent;
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return;
    if (e.key === "Enter") {
      e.preventDefault();
      await onCreateTag();
      return;
    }
    if (e.key === "Escape") {
      setIsTagInputOpen(false);
      setNewTagName("");
    }
  };

  const tags = tagsQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!openMenuNoteId) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".memo-menu-wrap")) {
        setOpenMenuNoteId(null);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [openMenuNoteId]);

  useEffect(() => {
    if (!isComposerTagPickerOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!composerTagPickerWrapRef.current?.contains(target)) {
        setIsComposerTagPickerOpen(false);
        setComposerTagKeyword("");
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [isComposerTagPickerOpen]);

  const composerSelectedTags = useMemo(
    () => tags.filter((tag) => composerTagIds.includes(tag.id)),
    [tags, composerTagIds],
  );

  const composerMatchedTags = useMemo(() => {
    const keyword = composerTagKeyword.trim().toLowerCase();
    if (!keyword) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(keyword));
  }, [tags, composerTagKeyword]);

  const composerFilteredTags = useMemo(() => composerMatchedTags.slice(0, 3), [composerMatchedTags]);

  const toggleComposerTag = (tagId: number) => {
    setComposerTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const createComposerTag = async () => {
    const keyword = composerTagKeyword.trim();
    if (!keyword) return;
    const created = await createTagMutation.mutateAsync({ name: keyword });
    await queryClient.invalidateQueries({ queryKey: ["tags"] });
    setComposerTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setComposerTagKeyword("");
  };

  const onComposerTagInputKeyDown: KeyboardEventHandler<HTMLInputElement> = async (e) => {
    const nativeEvent = e.nativeEvent as KeyboardEvent;
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const keyword = composerTagKeyword.trim().toLowerCase();
      if (!keyword) return;
      const exactMatched = tags.find((tag) => tag.name.toLowerCase() === keyword);
      if (exactMatched) {
        toggleComposerTag(exactMatched.id);
        setComposerTagKeyword("");
        return;
      }
      await createComposerTag();
      return;
    }
    if (e.key === "Escape") {
      setIsComposerTagPickerOpen(false);
      setComposerTagKeyword("");
    }
  };

    return (
    <div className="memo-layout">
      <section className="border-r border-[#dbe1ea] bg-[#f8f8f6] p-4">
        <div className="mb-4">
          <TextInput
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索笔记..."
            value={searchText}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[15px] font-bold text-slate-700">标签</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                    selected
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300"
                  }`}
                  onClick={() => toggleTagFilter(tag.id)}
                  type="button"
                >
                  #{tag.name}
                </button>
              );
            })}
            {isTagInputOpen ? (
              <input
                autoFocus
                className="h-8 w-28 rounded-full border border-blue-300 bg-white px-2.5 text-xs font-semibold text-blue-900 outline-none"
                onBlur={() => {
                  if (!createTagMutation.isPending) {
                    setIsTagInputOpen(false);
                    setNewTagName("");
                  }
                }}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={onTagInputKeyDown}
                placeholder="新标签"
                value={newTagName}
              />
            ) : (
              <button
                className="h-8 w-8 rounded-full border border-dashed border-blue-300 bg-blue-50 text-lg font-bold leading-none text-blue-700"
                onClick={() => setIsTagInputOpen(true)}
                type="button"
              >
                +
              </button>
            )}
          </div>
          {createTagMutation.isError ? <FieldError>创建失败，可能标签已存在</FieldError> : null}
        </div>
      </section>

      <section className="bg-[#f8f8f6] p-5">
        <form className="rounded-2xl border border-[#dbe1ea] bg-white p-4" onSubmit={handleSubmit(onCreateNote)}>
          <textarea
            className="min-h-[84px] w-full resize-y border-none p-0 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="此刻的想法..."
            rows={4}
            {...register("content")}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-h-8 flex-wrap items-center gap-2">
              {composerSelectedTags.map((tag) => (
                <button
                  key={tag.id}
                  className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                  onClick={() => toggleComposerTag(tag.id)}
                  type="button"
                >
                  #{tag.name} ×
                </button>
              ))}
              <div className="relative" ref={composerTagPickerWrapRef}>
                {isComposerTagPickerOpen ? (
                  <input
                    autoFocus
                    className="h-8 w-40 rounded-full border border-blue-300 bg-white px-2.5 text-xs font-semibold text-blue-900 outline-none"
                    onChange={(e) => setComposerTagKeyword(e.target.value)}
                    onKeyDown={onComposerTagInputKeyDown}
                    placeholder="# 输入标签名"
                    value={composerTagKeyword}
                  />
                ) : (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-blue-300 bg-blue-50 text-lg font-bold leading-none text-blue-700"
                    onClick={() => {
                      setComposerTagKeyword("");
                      setIsComposerTagPickerOpen(true);
                    }}
                    type="button"
                  >
                    #
                  </button>
                )}
                {isComposerTagPickerOpen && composerFilteredTags.length > 0 ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-blue-100 bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.14)]">
                    <div className="flex max-h-[180px] flex-col gap-1.5 overflow-auto">
                      {composerFilteredTags.map((tag) => {
                        const checked = composerTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            className={`flex items-center justify-start rounded-lg border px-2.5 py-1.5 text-left text-xs ${
                              checked
                                ? "border-blue-300 bg-blue-50 text-blue-800"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleComposerTag(tag.id)}
                            type="button"
                          >
                            #{tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <PrimaryButton
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending || setTagsMutation.isPending}
              type="submit"
            >
              {createNoteMutation.isPending || updateNoteMutation.isPending || setTagsMutation.isPending
                ? "保存中..."
                : editingNoteId
                  ? "保存修改"
                  : "保存"}
            </PrimaryButton>
          </div>
          {errors.content ? <FieldError>{errors.content.message}</FieldError> : null}
        </form>

        <div className="mt-4 flex flex-col gap-3">
          {notesQuery.isLoading ? <p>加载中...</p> : null}
          {notesQuery.isError ? <FormError>加载失败，请刷新重试</FormError> : null}
          {notes.length === 0 ? <p className="text-slate-600">暂无笔记</p> : null}
          {notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-[#dbe1ea] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">{formatRelativeTime(note.updated_at)}</span>
                <div className="memo-menu-wrap relative">
                  <button
                    className="rounded-md border border-[#dbe1ea] bg-white px-2 py-0.5 text-base leading-none text-slate-500"
                    onClick={() => setOpenMenuNoteId((prev) => (prev === note.id ? null : note.id))}
                    type="button"
                  >
                    ...
                  </button>
                  {openMenuNoteId === note.id ? (
                    <div className="absolute right-0 top-7 z-20 min-w-[108px] rounded-lg border border-[#dbe1ea] bg-white p-1 shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                      <button
                        className="w-full rounded-md bg-white px-2 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => {
                          reset({ content: note.content });
                          setEditingNoteId(note.id);
                          setComposerTagIds(note.tags.map((tag) => tag.id));
                          setIsComposerTagPickerOpen(false);
                          setComposerTagKeyword("");
                          setOpenMenuNoteId(null);
                        }}
                        type="button"
                      >
                        编辑
                      </button>
                      <button
                        className="w-full rounded-md bg-white px-2 py-1.5 text-left text-sm text-red-700 hover:bg-slate-100"
                        disabled={archiveNoteMutation.isPending}
                        onClick={() => {
                          archiveNoteMutation.mutate(note.id);
                          setOpenMenuNoteId(null);
                        }}
                        type="button"
                      >
                        归档
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="mb-2 whitespace-pre-wrap text-slate-900">{note.content}</p>
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <span key={tag.id} className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    #{tag.name}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
