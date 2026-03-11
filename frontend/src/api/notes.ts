import { api } from "./client";
import { ApiEnvelope, unwrapEnvelope } from "./envelope";

export type NoteTag = {
  id: number;
  name: string;
  color: string | null;
};

export type Note = {
  id: number;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
  tags: NoteTag[];
};

export type NoteReminder = {
  id: number;
  note_id: number;
  title: string;
  calendar_type: "solar" | "lunar";
  month: number;
  day: number;
  is_leap_month: boolean;
  time_of_day: string;
  timezone: string;
  remind_before_days: number;
  is_active: boolean;
  last_triggered_at: string | null;
  next_trigger_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteReminderPayload = {
  title: string;
  calendar_type: "solar" | "lunar";
  month: number;
  day: number;
  is_leap_month: boolean;
  time_of_day: string;
  timezone: string;
  remind_before_days: number;
  is_active: boolean;
};

export type CreateNotePayload = {
  title?: string | null;
  content: string;
};

export type UpdateNotePayload = {
  title?: string | null;
  content?: string;
};

export type ListNotesParams = {
  archived?: boolean;
  tagIds?: number[];
  search?: string;
};

export async function listNotes(params: ListNotesParams = {}) {
  const query: Record<string, string> = {};
  if (params.archived !== undefined) {
    query.archived = String(params.archived);
  }
  if (params.tagIds && params.tagIds.length > 0) {
    query.tag_ids = params.tagIds.join(",");
  }
  if (params.search && params.search.trim()) {
    query.search = params.search.trim();
  }
  const response = await api.get<ApiEnvelope<Note[]>>("/notes", { params: query });
  return unwrapEnvelope(response.data);
}

export async function createNote(payload: CreateNotePayload) {
  const response = await api.post<ApiEnvelope<Note>>("/notes", payload);
  return unwrapEnvelope(response.data);
}

export async function getNote(noteId: number) {
  const response = await api.get<ApiEnvelope<Note>>(`/notes/${noteId}`);
  return unwrapEnvelope(response.data);
}

export async function updateNote(noteId: number, payload: UpdateNotePayload) {
  const response = await api.put<ApiEnvelope<Note>>(`/notes/${noteId}`, payload);
  return unwrapEnvelope(response.data);
}

export async function deleteNote(noteId: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/notes/${noteId}`);
  unwrapEnvelope(response.data);
}

export async function restoreNote(noteId: number) {
  const response = await api.post<ApiEnvelope<Note>>(`/notes/${noteId}/restore`);
  return unwrapEnvelope(response.data);
}

export async function setNoteTags(noteId: number, tagIds: number[]) {
  const response = await api.put<ApiEnvelope<Note>>(`/notes/${noteId}/tags`, { tag_ids: tagIds });
  return unwrapEnvelope(response.data);
}

export async function listNoteReminders(noteId: number) {
  const response = await api.get<ApiEnvelope<NoteReminder[]>>(`/notes/${noteId}/reminders`);
  return unwrapEnvelope(response.data);
}

export async function createNoteReminder(noteId: number, payload: NoteReminderPayload) {
  const response = await api.post<ApiEnvelope<NoteReminder>>(`/notes/${noteId}/reminders`, payload);
  return unwrapEnvelope(response.data);
}

export async function updateNoteReminder(noteId: number, reminderId: number, payload: Partial<NoteReminderPayload>) {
  const response = await api.patch<ApiEnvelope<NoteReminder>>(`/notes/${noteId}/reminders/${reminderId}`, payload);
  return unwrapEnvelope(response.data);
}

export async function deleteNoteReminder(noteId: number, reminderId: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/notes/${noteId}/reminders/${reminderId}`);
  unwrapEnvelope(response.data);
}
