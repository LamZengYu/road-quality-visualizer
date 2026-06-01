import { api } from './client';
import type { AuthRequest, AuthResponse } from '@rqv/shared';

export async function register(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password } satisfies AuthRequest);
  return data;
}
export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password } satisfies AuthRequest);
  return data;
}
