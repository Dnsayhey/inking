import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
  restoreNote,
  setNoteTags,
  updateNote,
  updateNoteReminder,
} from "../api/notes";
import { createTag, listTags, Tag } from "../api/tags";
import { useToast } from "../components/ui";
import { NoteComposer } from "./notes/NoteComposer";
import { NotesList } from "./notes/NotesList";
import { NotesShell } from "./notes/NotesShell";
import { NotesSidebar } from "./notes/NotesSidebar";
import { ReminderModal } from "./notes/ReminderModal";
import {
  buildOptimisticNote,
  formatRelativeTime,
  getTodayWeekdayColor,
  mapSelectedTags,
  normalizeTimeToSeconds,
  noteMatchesFilters,
  readNotesFilters,
} from "./notes/notesPage.utils";
import { NoteFormData, NotesMutationContext, PendingReminder, ReminderDisplayItem, ReminderFormData } from "./notes/types";

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

  const updateAllNotesCaches = (updater: (notes: Note[], filters: ReturnType<typeof readNotesFilters>) => Note[]) => {
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
      if (tagIds.length > 0) {
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
    } else if (editingNoteId) {
      await createReminderMutation.mutateAsync(payload);
    } else {
      setPendingReminders((prev) => [...prev, { id: nextPendingReminderIdRef.current--, data: { ...payload } }]);
      showToast(t("notes.toast.reminderQueued"), "success");
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

  const composerSelectedTags = useMemo(() => tags.filter((tag) => composerTagIds.includes(tag.id)), [tags, composerTagIds]);

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

  const reminderItems: ReminderDisplayItem[] = editingNoteId
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
        source: "server",
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
        source: "local",
      }));

  return (
    <>
      <NotesShell
        sidebar={
          <NotesSidebar
            closeTagInput={() => setIsTagInputOpen(false)}
            createTagError={createTagMutation.isError}
            createTagErrorMessage={t("notes.createTagFailed")}
            createTagPending={createTagMutation.isPending}
            isTagInputOpen={isTagInputOpen}
            newTagName={newTagName}
            newTagPlaceholder={t("notes.newTagPlaceholder")}
            onSearchTextChange={setSearchText}
            onTagInputKeyDown={onTagInputKeyDown}
            onToggleTagFilter={toggleTagFilter}
            openTagInput={() => setIsTagInputOpen(true)}
            searchPlaceholder={isArchivedView ? t("notes.searchArchivedPlaceholder") : t("notes.searchPlaceholder")}
            searchText={searchText}
            selectedTagIds={selectedTagIds}
            setNewTagName={setNewTagName}
            tags={tags}
            tagsTitle={t("notes.tagsTitle")}
          />
        }
        content={
          <>
            <NoteComposer
              backHomeText={t("notes.backHome")}
              composerFilteredTags={composerFilteredTags}
              composerPlaceholder={t("notes.composerPlaceholder")}
              composerSelectedTags={composerSelectedTags}
              composerTagIds={composerTagIds}
              composerTagKeyword={composerTagKeyword}
              composerTagPickerWrapRef={composerTagPickerWrapRef}
              composerTagPlaceholder={t("notes.composerTagPlaceholder")}
              contentError={errors.content?.message}
              handleSubmit={handleSubmit}
              isArchivedView={isArchivedView}
              isEditing={Boolean(editingNoteId)}
              onBackHome={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("view");
                  return next;
                });
              }}
              onOpenReminderModal={() => setIsReminderModalOpen(true)}
              onSubmit={onCreateNote}
              onToggleComposerTag={toggleComposerTag}
              onComposerTagInputKeyDown={onComposerTagInputKeyDown}
              register={register}
              reminderCount={reminderCount}
              saveChangesText={t("notes.saveChanges")}
              saveText={t("notes.save")}
              saving={saving}
              savingText={t("notes.saving")}
              setComposerTagKeyword={setComposerTagKeyword}
              setIsComposerTagPickerOpen={setIsComposerTagPickerOpen}
              isComposerTagPickerOpen={isComposerTagPickerOpen}
            />

            <NotesList
              archivePending={archiveNoteMutation.isPending}
              emptyText={isArchivedView ? t("notes.emptyArchived") : t("notes.empty")}
              getRelativeTimeLabel={(note) => formatRelativeTime(note.updated_at, t)}
              isArchivedView={isArchivedView}
              menuArchiveLabel={t("notes.menuArchive")}
              menuEditLabel={t("notes.menuEdit")}
              menuUnarchiveLabel={t("notes.menuUnarchive")}
              notes={notes}
              notesError={notesQuery.isError}
              notesErrorMessage={t("notes.loadFailed")}
              notesLoading={notesQuery.isLoading}
              onArchive={(noteId) => {
                archiveNoteMutation.mutate(noteId);
                setOpenMenuNoteId(null);
              }}
              onEdit={(note) => {
                reset({ content: note.content });
                setEditingNoteId(note.id);
                setComposerTagIds(note.tags.map((tag) => tag.id));
                setIsComposerTagPickerOpen(false);
                setComposerTagKeyword("");
                setOpenMenuNoteId(null);
              }}
              onToggleMenu={(noteId) => setOpenMenuNoteId((prev) => (prev === noteId ? null : noteId))}
              onUnarchive={(noteId) => {
                restoreNoteMutation.mutate(noteId);
                setOpenMenuNoteId(null);
              }}
              openMenuNoteId={openMenuNoteId}
              reminderCountByNoteId={reminderCountByNoteId}
              restorePending={restoreNoteMutation.isPending}
            />
          </>
        }
      />

      <ReminderModal
        activeText={t("notes.active")}
        calendarLunarText={t("notes.calendarLunar")}
        calendarSolarText={t("notes.calendarSolar")}
        cancelEditText={t("notes.cancelEdit")}
        draftEmptyText={t("notes.reminderDraftEmpty")}
        draftHintText={t("notes.reminderDraftHint")}
        editingNoteId={editingNoteId}
        editingReminderId={editingReminderId}
        hasServerReminders={currentReminders.length > 0}
        inactiveText={t("notes.inactive")}
        items={reminderItems}
        leapMonthText={t("notes.leapMonth")}
        loadingText={t("notes.loading")}
        onCancelEdit={resetReminderForm}
        onClose={() => {
          setIsReminderModalOpen(false);
          resetReminderForm();
        }}
        onDeleteItem={(reminder) => {
          if (reminder.source === "server") {
            deleteReminderMutation.mutate(reminder.id);
            return;
          }
          setPendingReminders((prev) => prev.filter((item) => item.id !== reminder.id));
          if (editingReminderId === reminder.id) {
            resetReminderForm();
          }
        }}
        onEditItem={(reminder) => {
          if (reminder.source === "server") {
            const target = currentReminders.find((item) => item.id === reminder.id);
            if (target) startEditReminder(target);
            return;
          }
          const target = pendingReminders.find((item) => item.id === reminder.id);
          if (target) startEditPendingReminder(target);
        }}
        onSaveReminder={onSaveReminder}
        onToggleActive={(reminder) => {
          if (reminder.source === "server") {
            updateReminderMutation.mutate({
              reminderId: reminder.id,
              payload: { is_active: !reminder.is_active },
            });
            return;
          }
          setPendingReminders((prev) =>
            prev.map((item) =>
              item.id === reminder.id ? { ...item, data: { ...item.data, is_active: !item.data.is_active } } : item,
            ),
          );
        }}
        open={isReminderModalOpen}
        reminderAddText={t("notes.reminderAdd")}
        reminderCreateLabel={t("notes.reminderCreate")}
        reminderEditLabel={t("notes.reminderEdit")}
        reminderEmptyText={t("notes.reminderEmpty")}
        reminderForm={reminderForm}
        reminderTitlePlaceholder={t("notes.reminderTitlePlaceholder")}
        remindBeforeDaysText={(count) => t("notes.remindBeforeDays", { count })}
        remindersLoading={remindersQuery.isLoading}
        saveChangesText={t("notes.saveChanges")}
        savePending={createReminderMutation.isPending || updateReminderMutation.isPending}
        setReminderForm={(updater) => setReminderForm((prev) => updater(prev))}
        title={t("notes.remindersTitle", { count: reminderCount })}
      />
    </>
  );
}
