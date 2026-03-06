import { Note } from "../../api/notes";
import { Tag } from "../../api/tags";
import { NotesFilters } from "./types";

const WEEKDAY_COLORS: Record<number, string> = {
  0: "#a855f7",
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#06b6d4",
  6: "#3b82f6",
};

export function formatRelativeTime(iso: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("notes.time.justNow");
  if (min < 60) return t("notes.time.minutesAgo", { count: min });
  const hour = Math.floor(min / 60);
  if (hour < 24) return t("notes.time.hoursAgo", { count: hour });
  const day = Math.floor(hour / 24);
  return t("notes.time.daysAgo", { count: day });
}

export function readNotesFilters(queryKey: readonly unknown[]): NotesFilters {
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

export function noteMatchesFilters(note: Note, filters: NotesFilters): boolean {
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

export function mapSelectedTags(allTags: Tag[], tagIds: number[]): Note["tags"] {
  return allTags
    .filter((tag) => tagIds.includes(tag.id))
    .map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));
}

export function buildOptimisticNote(tempId: number, content: string, tags: Note["tags"]): Note {
  const now = new Date().toISOString();
  return {
    id: tempId,
    title: null,
    content,
    created_at: now,
    updated_at: now,
    is_archived: false,
    archived_at: null,
    tags,
  };
}

export function getTodayWeekdayColor(): string {
  return WEEKDAY_COLORS[new Date().getDay()] ?? "#3b82f6";
}

export function normalizeTimeToSeconds(input: string): string {
  return input.length === 5 ? `${input}:00` : input;
}
