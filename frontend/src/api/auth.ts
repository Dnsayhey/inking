import { api } from "./client";
import { ApiEnvelope, unwrapEnvelope } from "./envelope";

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  password: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserProfile = {
  id: number;
  username: string;
  is_active: boolean;
  created_at: string;
};

export async function register(payload: RegisterPayload) {
  const response = await api.post<ApiEnvelope<UserProfile>>("/auth/register", payload);
  return unwrapEnvelope(response.data);
}

export async function login(payload: LoginPayload) {
  const response = await api.post<ApiEnvelope<TokenPair>>("/auth/login", payload);
  return unwrapEnvelope(response.data);
}

export async function getMe() {
  const response = await api.get<ApiEnvelope<UserProfile>>("/auth/me");
  return unwrapEnvelope(response.data);
}

export async function logout(refreshToken: string) {
  const response = await api.post<ApiEnvelope<null>>("/auth/logout", { refresh_token: refreshToken });
  unwrapEnvelope(response.data);
}
