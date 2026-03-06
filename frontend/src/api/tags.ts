import { api } from "./client";

export type Tag = {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTagPayload = {
  name: string;
  color?: string | null;
};

export type UpdateTagPayload = {
  name?: string;
  color?: string | null;
};

export async function listTags(search?: string) {
  const response = await api.get<Tag[]>("/tags", {
    params: search ? { search } : undefined,
  });
  return response.data;
}

export async function createTag(payload: CreateTagPayload) {
  const response = await api.post<Tag>("/tags", payload);
  return response.data;
}

export async function updateTag(tagId: number, payload: UpdateTagPayload) {
  const response = await api.patch<Tag>(`/tags/${tagId}`, payload);
  return response.data;
}

export async function deleteTag(tagId: number) {
  await api.delete(`/tags/${tagId}`);
}
