import { api } from "./client";

export type NoteTag = {
  id: number;
  name: string;
  color: string | null;
};

export type Note = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
  tags: NoteTag[];
};

export type CreateNotePayload = {
  content: string;
};

export type UpdateNotePayload = {
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
  const response = await api.get<Note[]>("/notes", { params: query });
  return response.data;
}

export async function createNote(payload: CreateNotePayload) {
  const response = await api.post<Note>("/notes", payload);
  return response.data;
}

export async function updateNote(noteId: number, payload: UpdateNotePayload) {
  const response = await api.put<Note>(`/notes/${noteId}`, payload);
  return response.data;
}

export async function deleteNote(noteId: number) {
  await api.delete(`/notes/${noteId}`);
}

export async function restoreNote(noteId: number) {
  const response = await api.post<Note>(`/notes/${noteId}/restore`);
  return response.data;
}

export async function setNoteTags(noteId: number, tagIds: number[]) {
  const response = await api.put<Note>(`/notes/${noteId}/tags`, { tag_ids: tagIds });
  return response.data;
}
