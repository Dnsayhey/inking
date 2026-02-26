import { api } from "./client";

export type Note = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

export type CreateNotePayload = {
  title: string;
  content: string;
};

export type UpdateNotePayload = {
  title?: string;
  content?: string;
};

export async function listNotes() {
  const response = await api.get<Note[]>("/notes");
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
