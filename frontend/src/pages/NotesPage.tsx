import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Hash, Plus } from "lucide-react";
import { KeyboardEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import { createNote, deleteNote, listNotes, Note, restoreNote, setNoteTags, updateNote } from "../api/notes";
import { createTag, listTags, Tag } from "../api/tags";
import { Card, DropdownMenu, FieldError, FormError, PrimaryButton, TagChip, TextInput, useToast } from "../components/ui";

type NoteFormData = {
  content: string;
};

type NotesFilters = {
  archived: boolean;
  search: string;
  tagIds: number[];
};

type NotesMutationContext = {
  previous: Array<[readonly unknown[], Note[] | undefined]>;
  tempId?: number;
};

const WEEKDAY_COLORS: Record<number, string> = {
  0: "#a855f7", // Sunday
  1: "#ef4444", // Monday
  2: "#f97316", // Tuesday
  3: "#eab308", // Wednesday
  4: "#22c55e", // Thursday
  5: "#06b6d4", // Friday
  6: "#3b82f6", // Saturday
};

function formatRelativeTime(iso: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("notes.time.justNow");
  if (min < 60) return t("notes.time.minutesAgo", { count: min });
  const hour = Math.floor(min / 60);
  if (hour < 24) return t("notes.time.hoursAgo", { count: hour });
  const day = Math.floor(hour / 24);
  return t("notes.time.daysAgo", { count: day });
}

function readNotesFilters(queryKey: readonly unknown[]): NotesFilters {
  const candidate = queryKey[1];
  if (!candidate || typeof candidate !== "object") {
    return { archived: false, search: "", tagIds: [] };
  }
  const record = candidate as Record<string, unknown>;
  return {
    archived: Boolean(record.archived),
    search: typeof record.search === "string" ? record.search.trim().toLowerCase() : "",
    tagIds: Array.isArray(record.tagIds)
      ? record.tagIds.filter((value): value is number => typeof value === "number")
      : [],
  };
}

function noteMatchesFilters(note: Note, filters: NotesFilters): boolean {
  if (note.is_archived !== filters.archived) {
    return false;
  }
  if (filters.search && !note.content.toLowerCase().includes(filters.search)) {
    return false;
  }
  if (filters.tagIds.length === 0) {
    return true;
  }
  const noteTagIds = new Set(note.tags.map((tag) => tag.id));
  return filters.tagIds.every((tagId) => noteTagIds.has(tagId));
}

function mapSelectedTags(allTags: Tag[], tagIds: number[]): Note["tags"] {
  return allTags
    .filter((tag) => tagIds.includes(tag.id))
    .map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));
}

function buildOptimisticNote(tempId: number, content: string, tags: Note["tags"]): Note {
  const now = new Date().toISOString();
  return {
    id: tempId,
    content,
    created_at: now,
    updated_at: now,
    is_archived: false,
    archived_at: null,
    tags,
  };
}

function getTodayWeekdayColor(): string {
  return WEEKDAY_COLORS[new Date().getDay()] ?? "#3b82f6";
}

export function NotesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const nextTempIdRef = useRef(-1);
  const isArchivedView = searchParams.get("view") === "archived";
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
    queryKey: ["notes", { archived: isArchivedView, search: debouncedSearchText, tagIds: selectedTagIds }],
    queryFn: () =>
      listNotes({ archived: isArchivedView, tagIds: selectedTagIds, search: debouncedSearchText || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormData>({
    resolver: zodResolver(
      z.object({
        content: z.string().min(1, t("notes.contentRequired")),
      }),
    ),
    defaultValues: { content: "" },
  });

  const updateAllNotesCaches = (updater: (notes: Note[], filters: NotesFilters) => Note[]) => {
    const cachedEntries = queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] });
    cachedEntries.forEach(([queryKey, cachedNotes]) => {
      if (!cachedNotes) return;
      queryClient.setQueryData<Note[]>(queryKey, updater(cachedNotes, readNotesFilters(queryKey)));
    });
  };

  const restoreNotesCaches = (previous: NotesMutationContext["previous"]) => {
    previous.forEach(([queryKey, cachedNotes]) => {
      queryClient.setQueryData<Note[] | undefined>(queryKey, cachedNotes);
    });
  };

  const createNoteMutation = useMutation({
    mutationFn: async ({ content, tagIds }: { content: string; tagIds: number[] }) => {
      const created = await createNote({ content });
      if (tagIds.length === 0) {
        return created;
      }
      return setNoteTags(created.id, tagIds);
    },
    onMutate: async ({ content, tagIds }): Promise<NotesMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] });
      const allTags = queryClient.getQueryData<Tag[]>(["tags"]) ?? [];
      const optimisticNote = buildOptimisticNote(nextTempIdRef.current--, content, mapSelectedTags(allTags, tagIds));

      updateAllNotesCaches((notes, filters) => {
        if (!noteMatchesFilters(optimisticNote, filters)) {
          return notes;
        }
        return [optimisticNote, ...notes.filter((note) => note.id !== optimisticNote.id)];
      });

      return { previous, tempId: optimisticNote.id };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        restoreNotesCaches(context.previous);
      }
      showToast(t("notes.toast.createFailed"), "error");
    },
    onSuccess: (createdNote, _variables, context) => {
      updateAllNotesCaches((notes, filters) => {
        const next = context?.tempId ? notes.filter((note) => note.id !== context.tempId) : notes;
        if (!noteMatchesFilters(createdNote, filters)) {
          return next;
        }
        return [createdNote, ...next.filter((note) => note.id !== createdNote.id)];
      });
      reset({ content: "" });
      setComposerTagIds([]);
      setComposerTagKeyword("");
      setIsComposerTagPickerOpen(false);
      showToast(t("notes.toast.created"), "success");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content, tagIds }: { noteId: number; content: string; tagIds: number[] }) => {
      await updateNote(noteId, { content });
      return setNoteTags(noteId, tagIds);
    },
    onMutate: async ({ noteId, content, tagIds }): Promise<NotesMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] });
      const allTags = queryClient.getQueryData<Tag[]>(["tags"]) ?? [];
      const optimisticTags = mapSelectedTags(allTags, tagIds);
      const optimisticUpdatedAt = new Date().toISOString();

      updateAllNotesCaches((notes, filters) =>
        notes
          .map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  content,
                  tags: optimisticTags,
                  updated_at: optimisticUpdatedAt,
                }
              : note,
          )
          .filter((note) => noteMatchesFilters(note, filters)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        restoreNotesCaches(context.previous);
      }
      showToast(t("notes.toast.updateFailed"), "error");
    },
    onSuccess: (updatedNote) => {
      updateAllNotesCaches((notes, filters) => {
        const next = notes.filter((note) => note.id !== updatedNote.id);
        if (!noteMatchesFilters(updatedNote, filters)) {
          return next;
        }
        return [updatedNote, ...next];
      });
      setEditingNoteId(null);
      setOpenMenuNoteId(null);
      reset({ content: "" });
      setComposerTagIds([]);
      setComposerTagKeyword("");
      setIsComposerTagPickerOpen(false);
      showToast(t("notes.toast.updated"), "success");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const archiveNoteMutation = useMutation({
    mutationFn: deleteNote,
    onMutate: async (noteId): Promise<NotesMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] });
      updateAllNotesCaches((notes) => notes.filter((note) => note.id !== noteId));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        restoreNotesCaches(context.previous);
      }
      showToast(t("notes.toast.archiveFailed"), "error");
    },
    onSuccess: () => {
      showToast(t("notes.toast.archived"), "success");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const restoreNoteMutation = useMutation({
    mutationFn: restoreNote,
    onMutate: async (noteId): Promise<NotesMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] });
      updateAllNotesCaches((notes) => notes.filter((note) => note.id !== noteId));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        restoreNotesCaches(context.previous);
      }
      showToast(t("notes.toast.unarchiveFailed"), "error");
    },
    onSuccess: () => {
      showToast(t("notes.toast.unarchived"), "success");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async (createdTag) => {
      setNewTagName("");
      setIsTagInputOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      showToast(t("notes.toast.tagCreated", { name: createdTag.name }), "success");
    },
    onError: () => {
      showToast(t("notes.toast.tagCreateFailed"), "error");
    },
  });

  const onCreateNote = async (data: NoteFormData) => {
    if (editingNoteId) {
      await updateNoteMutation.mutateAsync({ noteId: editingNoteId, content: data.content, tagIds: composerTagIds });
      return;
    }
    await createNoteMutation.mutateAsync({ content: data.content, tagIds: composerTagIds });
  };

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const onCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await createTagMutation.mutateAsync({ name, color: getTodayWeekdayColor() });
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
    setOpenMenuNoteId(null);
    setEditingNoteId(null);
    setIsComposerTagPickerOpen(false);
    setComposerTagKeyword("");
  }, [isArchivedView]);

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

    const exactMatched = tags.find((tag) => tag.name.toLowerCase() === keyword.toLowerCase());
    if (exactMatched) {
      setComposerTagIds((prev) => (prev.includes(exactMatched.id) ? prev : [...prev, exactMatched.id]));
      setComposerTagKeyword("");
      return;
    }

    const created = await createTagMutation.mutateAsync({ name: keyword, color: getTodayWeekdayColor() });
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

  const saving = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <div className="memo-layout">
      <section className="border-r border-surface-line bg-surface-page p-5">
        <div className="mb-4">
          <TextInput
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={isArchivedView ? t("notes.searchArchivedPlaceholder") : t("notes.searchPlaceholder")}
            value={searchText}
          />
        </div>

        <Card className="p-3">
          <p className="mb-2 text-[15px] font-bold text-slate-700">{t("notes.tagsTitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <TagChip
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  color={tag.color}
                  variant={selected ? "filterSelected" : "filter"}
                >
                  #{tag.name}
                </TagChip>
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
                placeholder={t("notes.newTagPlaceholder")}
                value={newTagName}
              />
            ) : (
              <button
                className="h-8 w-8 rounded-full border border-dashed border-blue-300 bg-blue-50 text-lg font-bold leading-none text-blue-700"
                onClick={() => setIsTagInputOpen(true)}
                type="button"
              >
                <Plus className="mx-auto h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
          {createTagMutation.isError ? <FieldError>{t("notes.createTagFailed")}</FieldError> : null}
        </Card>
      </section>

      <section className="bg-surface-page py-5 px-20">
        <Card className="p-4">
          {isArchivedView ? (
            <button
              className="flex items-center gap-2 rounded-lg border border-surface-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("view");
                  return next;
                });
              }}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("notes.backHome")}
            </button>
          ) : (
            <form onSubmit={handleSubmit(onCreateNote)}>
              <textarea
                className="min-h-[84px] w-full resize-y border-none p-0 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                placeholder={t("notes.composerPlaceholder")}
                rows={4}
                {...register("content")}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  {composerSelectedTags.map((tag) => (
                    <TagChip key={tag.id} color={tag.color} onClick={() => toggleComposerTag(tag.id)} variant="muted">
                      #{tag.name} ×
                    </TagChip>
                  ))}
                  <div className="relative" ref={composerTagPickerWrapRef}>
                    {isComposerTagPickerOpen ? (
                      <input
                        autoFocus
                        className="h-8 w-40 rounded-full border border-blue-300 bg-white px-2.5 text-xs font-semibold text-blue-900 outline-none"
                        onChange={(e) => setComposerTagKeyword(e.target.value)}
                        onKeyDown={onComposerTagInputKeyDown}
                        placeholder={t("notes.composerTagPlaceholder")}
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
                        <Hash className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    )}
                    {isComposerTagPickerOpen && composerFilteredTags.length > 0 ? (
                      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-blue-100 bg-white p-2 shadow-elev-lg">
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
                <PrimaryButton disabled={saving} type="submit">
                  {saving ? t("notes.saving") : editingNoteId ? t("notes.saveChanges") : t("notes.save")}
                </PrimaryButton>
              </div>
              {errors.content ? <FieldError>{errors.content.message}</FieldError> : null}
            </form>
          )}
        </Card>

        <div className="mt-4 flex flex-col gap-3">
          {notesQuery.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="animate-pulse p-3">
                  <div className="mb-3 h-3 w-20 rounded bg-slate-200" />
                  <div className="mb-2 h-3 w-full rounded bg-slate-200" />
                  <div className="h-3 w-5/6 rounded bg-slate-200" />
                </Card>
              ))
            : null}
          {notesQuery.isError ? <FormError>{t("notes.loadFailed")}</FormError> : null}
          {!notesQuery.isLoading && notes.length === 0 ? (
            <p className="text-slate-600">{isArchivedView ? t("notes.emptyArchived") : t("notes.empty")}</p>
          ) : null}
          {notes.map((note) => (
            <Card key={note.id} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">{formatRelativeTime(note.updated_at, t)}</span>
                <DropdownMenu
                  items={
                    isArchivedView
                      ? [
                          {
                            label: t("notes.menuUnarchive"),
                            disabled: restoreNoteMutation.isPending,
                            onClick: () => {
                              restoreNoteMutation.mutate(note.id);
                              setOpenMenuNoteId(null);
                            },
                          },
                        ]
                      : [
                          {
                            label: t("notes.menuEdit"),
                            onClick: () => {
                              reset({ content: note.content });
                              setEditingNoteId(note.id);
                              setComposerTagIds(note.tags.map((tag) => tag.id));
                              setIsComposerTagPickerOpen(false);
                              setComposerTagKeyword("");
                              setOpenMenuNoteId(null);
                            },
                          },
                          {
                            label: t("notes.menuArchive"),
                            danger: true,
                            disabled: archiveNoteMutation.isPending,
                            onClick: () => {
                              archiveNoteMutation.mutate(note.id);
                              setOpenMenuNoteId(null);
                            },
                          },
                        ]
                  }
                  onToggle={() => setOpenMenuNoteId((prev) => (prev === note.id ? null : note.id))}
                  open={openMenuNoteId === note.id}
                />
              </div>
              <p className="mb-2 whitespace-pre-wrap text-slate-900">{note.content}</p>
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <TagChip key={tag.id} color={tag.color} variant="muted">
                    #{tag.name}
                  </TagChip>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
