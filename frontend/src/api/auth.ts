import { api } from "./client";

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
  const response = await api.post<UserProfile>("/auth/register", payload);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await api.post<TokenPair>("/auth/login", payload);
  return response.data;
}

export async function getMe() {
  const response = await api.get<UserProfile>("/auth/me");
  return response.data;
}

export async function logout(refreshToken: string) {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}
