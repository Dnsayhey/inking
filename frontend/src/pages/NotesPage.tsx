import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, ArrowLeft, Hash, Pencil, Plus, Trash2, X } from "lucide-react";
import { KeyboardEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import {
  createNote,
  createNoteReminder,
  deleteNote,
  deleteNoteReminder,
  listNoteReminders,
  listNotes,
  Note,
  NoteReminder,
  NoteReminderPayload,
  restoreNote,
  setNoteTags,
  updateNote,
  updateNoteReminder,
} from "../api/notes";
import { createTag, listTags, Tag } from "../api/tags";
import { Card, DropdownMenu, FieldError, FormError, PrimaryButton, TagChip, TextInput, useToast } from "../components/ui";

type NoteFormData = {
  content: string;
};

type ReminderFormData = NoteReminderPayload;
type PendingReminder = {
  id: number;
  data: ReminderFormData;
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

function normalizeTimeToSeconds(input: string): string {
  return input.length === 5 ? `${input}:00` : input;
}

export function NotesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const nextTempIdRef = useRef(-1);
  const nextPendingReminderIdRef = useRef(-1);
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
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);
  const [reminderForm, setReminderForm] = useState<ReminderFormData>({
    title: "",
    calendar_type: "solar",
    month: 1,
    day: 1,
    is_leap_month: false,
    time_of_day: "09:00",
    timezone: "Asia/Shanghai",
    remind_before_days: 0,
    is_active: true,
  });
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

  const remindersQuery = useQuery({
    queryKey: ["reminders", editingNoteId],
    queryFn: () => listNoteReminders(editingNoteId as number),
    enabled: editingNoteId !== null,
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
    mutationFn: async ({
      content,
      tagIds,
      reminders,
    }: {
      content: string;
      tagIds: number[];
      reminders: ReminderFormData[];
    }) => {
      let created = await createNote({ content });
      if (tagIds.length === 0) {
        // noop
      } else {
        created = await setNoteTags(created.id, tagIds);
      }

      let reminderFailed = 0;
      let reminderCreated = 0;
      const failedReminders: ReminderFormData[] = [];
      if (reminders.length > 0) {
        const settled = await Promise.allSettled(
          reminders.map((item) =>
            createNoteReminder(created.id, {
              ...item,
              title: item.title.trim(),
              time_of_day: normalizeTimeToSeconds(item.time_of_day),
            }),
          ),
        );
        settled.forEach((result, index) => {
          if (result.status === "fulfilled") {
            reminderCreated += 1;
          } else {
            reminderFailed += 1;
            failedReminders.push(reminders[index]);
          }
        });
      }

      return { note: created, reminderFailed, reminderCreated, failedReminders };
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
    onSuccess: (result, _variables, context) => {
      const createdNote = result.note;
      updateAllNotesCaches((notes, filters) => {
        const next = context?.tempId ? notes.filter((note) => note.id !== context.tempId) : notes;
        if (!noteMatchesFilters(createdNote, filters)) {
          return next;
        }
        return [createdNote, ...next.filter((note) => note.id !== createdNote.id)];
      });
      reset({ content: "" });
      setEditingNoteId(createdNote.id);
      setComposerTagIds([]);
      setComposerTagKeyword("");
      setIsComposerTagPickerOpen(false);
      if (result.failedReminders.length > 0) {
        setPendingReminders(result.failedReminders.map((item) => ({ id: nextPendingReminderIdRef.current--, data: item })));
        setIsReminderModalOpen(true);
      } else {
        setPendingReminders([]);
      }
      if (result.reminderCreated > 0) {
        showToast(t("notes.toast.reminderCreatedAfterSave", { count: result.reminderCreated }), "success");
      }
      if (result.reminderFailed > 0) {
        showToast(t("notes.toast.reminderPartialFailed", { count: result.reminderFailed }), "error");
      }
      void queryClient.invalidateQueries({ queryKey: ["reminders", createdNote.id] });
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

  const createReminderMutation = useMutation({
    mutationFn: async (payload: ReminderFormData) => {
      if (!editingNoteId) {
        throw new Error("missing note id");
      }
      return createNoteReminder(editingNoteId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders", editingNoteId] });
      showToast(t("notes.toast.reminderCreated"), "success");
    },
    onError: () => showToast(t("notes.toast.reminderCreateFailed"), "error"),
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ reminderId, payload }: { reminderId: number; payload: Partial<ReminderFormData> }) => {
      if (!editingNoteId) {
        throw new Error("missing note id");
      }
      return updateNoteReminder(editingNoteId, reminderId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders", editingNoteId] });
      showToast(t("notes.toast.reminderUpdated"), "success");
    },
    onError: () => showToast(t("notes.toast.reminderUpdateFailed"), "error"),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: number) => {
      if (!editingNoteId) {
        throw new Error("missing note id");
      }
      await deleteNoteReminder(editingNoteId, reminderId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders", editingNoteId] });
      showToast(t("notes.toast.reminderDeleted"), "success");
    },
    onError: () => showToast(t("notes.toast.reminderDeleteFailed"), "error"),
  });

  const onCreateNote = async (data: NoteFormData) => {
    if (editingNoteId) {
      await updateNoteMutation.mutateAsync({ noteId: editingNoteId, content: data.content, tagIds: composerTagIds });
      return;
    }
    await createNoteMutation.mutateAsync({
      content: data.content,
      tagIds: composerTagIds,
      reminders: pendingReminders.map((item) => item.data),
    });
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

  const resetReminderForm = () => {
    setEditingReminderId(null);
    setReminderForm({
      title: "",
      calendar_type: "solar",
      month: 1,
      day: 1,
      is_leap_month: false,
      time_of_day: "09:00",
      timezone: "Asia/Shanghai",
      remind_before_days: 0,
      is_active: true,
    });
  };

  const openReminderModal = () => {
    setIsReminderModalOpen(true);
  };

  const onSaveReminder = async () => {
    const payload: ReminderFormData = {
      ...reminderForm,
      title: reminderForm.title.trim(),
      time_of_day: normalizeTimeToSeconds(reminderForm.time_of_day),
    };
    if (!payload.title) {
      showToast(t("notes.reminderTitleRequired"), "error");
      return;
    }
    if (editingReminderId) {
      if (editingNoteId) {
        await updateReminderMutation.mutateAsync({ reminderId: editingReminderId, payload });
      } else {
        setPendingReminders((prev) =>
          prev.map((item) => (item.id === editingReminderId ? { ...item, data: { ...payload } } : item)),
        );
        showToast(t("notes.toast.reminderUpdated"), "success");
      }
    } else {
      if (editingNoteId) {
        await createReminderMutation.mutateAsync(payload);
      } else {
        setPendingReminders((prev) => [...prev, { id: nextPendingReminderIdRef.current--, data: { ...payload } }]);
        showToast(t("notes.toast.reminderQueued"), "success");
      }
    }
    resetReminderForm();
  };

  const startEditReminder = (item: NoteReminder) => {
    setEditingReminderId(item.id);
    setReminderForm({
      title: item.title,
      calendar_type: item.calendar_type,
      month: item.month,
      day: item.day,
      is_leap_month: item.is_leap_month,
      time_of_day: item.time_of_day.slice(0, 5),
      timezone: item.timezone,
      remind_before_days: item.remind_before_days,
      is_active: item.is_active,
    });
  };

  const startEditPendingReminder = (item: PendingReminder) => {
    setEditingReminderId(item.id);
    setReminderForm({ ...item.data });
  };

  const tags = tagsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const currentReminders = remindersQuery.data ?? [];
  const reminderCount = editingNoteId ? currentReminders.length : pendingReminders.length;
  const reminderCountQueries = useQueries({
    queries: notes.map((note) => ({
      queryKey: ["reminders", note.id],
      queryFn: () => listNoteReminders(note.id),
    })),
  });
  const reminderCountByNoteId = useMemo(() => {
    const result: Record<number, number> = {};
    notes.forEach((note, index) => {
      result[note.id] = reminderCountQueries[index]?.data?.length ?? 0;
    });
    return result;
  }, [notes, reminderCountQueries]);

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
    setIsReminderModalOpen(false);
    resetReminderForm();
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
                  <button
                    className="flex h-8 items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-100"
                    onClick={openReminderModal}
                    type="button"
                  >
                    <AlarmClock className="h-3.5 w-3.5" />
                    <span>{reminderCount}</span>
                  </button>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatRelativeTime(note.updated_at, t)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                    <AlarmClock className="h-3 w-3" />
                    {reminderCountByNoteId[note.id] ?? 0}
                  </span>
                </div>
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

      {isReminderModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-elev-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">{t("notes.remindersTitle", { count: reminderCount })}</h2>
              <button
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => {
                  setIsReminderModalOpen(false);
                  resetReminderForm();
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 max-h-[280px] space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              {editingNoteId && remindersQuery.isLoading ? <p className="text-sm text-slate-500">{t("notes.loading")}</p> : null}
              {editingNoteId && !remindersQuery.isLoading && currentReminders.length === 0 ? (
                <p className="text-sm text-slate-500">{t("notes.reminderEmpty")}</p>
              ) : null}
              {!editingNoteId && pendingReminders.length === 0 ? (
                <p className="text-sm text-slate-500">{t("notes.reminderDraftEmpty")}</p>
              ) : null}
              {(editingNoteId
                ? currentReminders.map((item) => ({
                    id: item.id,
                    title: item.title,
                    calendar_type: item.calendar_type,
                    month: item.month,
                    day: item.day,
                    is_leap_month: item.is_leap_month,
                    time_of_day: item.time_of_day,
                    timezone: item.timezone,
                    remind_before_days: item.remind_before_days,
                    is_active: item.is_active,
                    source: "server" as const,
                  }))
                : pendingReminders.map((item) => ({
                    id: item.id,
                    title: item.data.title,
                    calendar_type: item.data.calendar_type,
                    month: item.data.month,
                    day: item.data.day,
                    is_leap_month: item.data.is_leap_month,
                    time_of_day: item.data.time_of_day,
                    timezone: item.data.timezone,
                    remind_before_days: item.data.remind_before_days,
                    is_active: item.data.is_active,
                    source: "local" as const,
                  }))
              ).map((reminder) => (
                <div key={reminder.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {reminder.calendar_type === "lunar" ? t("notes.calendarLunar") : t("notes.calendarSolar")} ·{" "}
                        {reminder.month}/{reminder.day} · {reminder.time_of_day.slice(0, 5)} ·{" "}
                        {t("notes.remindBeforeDays", { count: reminder.remind_before_days })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${
                          reminder.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                        onClick={() => {
                          if (reminder.source === "server") {
                            updateReminderMutation.mutate({
                              reminderId: reminder.id,
                              payload: { is_active: !reminder.is_active },
                            });
                            return;
                          }
                          setPendingReminders((prev) =>
                            prev.map((item) =>
                              item.id === reminder.id
                                ? { ...item, data: { ...item.data, is_active: !item.data.is_active } }
                                : item,
                            ),
                          );
                        }}
                        type="button"
                      >
                        {reminder.is_active ? t("notes.active") : t("notes.inactive")}
                      </button>
                      <button
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => {
                          if (reminder.source === "server") {
                            const target = currentReminders.find((item) => item.id === reminder.id);
                            if (target) startEditReminder(target);
                            return;
                          }
                          const target = pendingReminders.find((item) => item.id === reminder.id);
                          if (target) startEditPendingReminder(target);
                        }}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => {
                          if (reminder.source === "server") {
                            deleteReminderMutation.mutate(reminder.id);
                            return;
                          }
                          setPendingReminders((prev) => prev.filter((item) => item.id !== reminder.id));
                          if (editingReminderId === reminder.id) {
                            resetReminderForm();
                          }
                        }}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                {editingReminderId ? t("notes.reminderEdit") : t("notes.reminderCreate")}
              </p>
              {!editingNoteId ? <p className="mb-2 text-xs text-slate-500">{t("notes.reminderDraftHint")}</p> : null}
              <div className="grid gap-2 md:grid-cols-2">
                <TextInput
                  onChange={(e) => setReminderForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t("notes.reminderTitlePlaceholder")}
                  value={reminderForm.title}
                />
                <select
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      calendar_type: e.target.value as "solar" | "lunar",
                      is_leap_month: e.target.value === "lunar" ? prev.is_leap_month : false,
                    }))
                  }
                  value={reminderForm.calendar_type}
                >
                  <option value="solar">{t("notes.calendarSolar")}</option>
                  <option value="lunar">{t("notes.calendarLunar")}</option>
                </select>
                <TextInput
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      month: Number(e.target.value || 1),
                    }))
                  }
                  type="number"
                  value={String(reminderForm.month)}
                />
                <TextInput
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      day: Number(e.target.value || 1),
                    }))
                  }
                  type="number"
                  value={String(reminderForm.day)}
                />
                <TextInput
                  onChange={(e) => setReminderForm((prev) => ({ ...prev, time_of_day: e.target.value }))}
                  type="time"
                  value={reminderForm.time_of_day}
                />
                <select
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-300"
                  onChange={(e) => setReminderForm((prev) => ({ ...prev, remind_before_days: Number(e.target.value) }))}
                  value={String(reminderForm.remind_before_days)}
                >
                  <option value="0">{t("notes.remindBeforeDays", { count: 0 })}</option>
                  <option value="1">{t("notes.remindBeforeDays", { count: 1 })}</option>
                  <option value="3">{t("notes.remindBeforeDays", { count: 3 })}</option>
                  <option value="7">{t("notes.remindBeforeDays", { count: 7 })}</option>
                </select>
                {reminderForm.calendar_type === "lunar" ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      checked={reminderForm.is_leap_month}
                      onChange={(e) => setReminderForm((prev) => ({ ...prev, is_leap_month: e.target.checked }))}
                      type="checkbox"
                    />
                    {t("notes.leapMonth")}
                  </label>
                ) : null}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                {editingReminderId ? (
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={resetReminderForm}
                    type="button"
                  >
                    {t("notes.cancelEdit")}
                  </button>
                ) : null}
                <PrimaryButton
                  disabled={createReminderMutation.isPending || updateReminderMutation.isPending}
                  onClick={onSaveReminder}
                  type="button"
                >
                  {editingReminderId ? t("notes.saveChanges") : t("notes.reminderAdd")}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
