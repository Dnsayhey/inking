import { api } from "./client";
import { ApiEnvelope, unwrapEnvelope } from "./envelope";

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

export type MergeTagPayload = {
  from_tag_id: number;
  to_tag_id: number;
};

export async function listTags(search?: string) {
  const response = await api.get<ApiEnvelope<Tag[]>>("/tags", {
    params: search ? { search } : undefined,
  });
  return unwrapEnvelope(response.data);
}

export async function createTag(payload: CreateTagPayload) {
  const response = await api.post<ApiEnvelope<Tag>>("/tags", payload);
  return unwrapEnvelope(response.data);
}

export async function updateTag(tagId: number, payload: UpdateTagPayload) {
  const response = await api.patch<ApiEnvelope<Tag>>(`/tags/${tagId}`, payload);
  return unwrapEnvelope(response.data);
}

export async function deleteTag(tagId: number) {
  const response = await api.delete<ApiEnvelope<null>>(`/tags/${tagId}`);
  unwrapEnvelope(response.data);
}

export async function mergeTags(payload: MergeTagPayload) {
  const response = await api.post<ApiEnvelope<Tag>>("/tags/merge", payload);
  return unwrapEnvelope(response.data);
}
