
// src/lib/heygen.ts

const SERVER_URL = import.meta.env.VITE_HEYGEN_SERVER_URL as string;
const API_KEY    = import.meta.env.VITE_HEYGEN_API_KEY as string;

export type HeygenSession = {
  session_id: string;
// ---- create_token（X-Api-Key を使う暫定運用） ----  url: string;            // LiveKit Room URL
export async function createSessionToken(): Promise<string> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.create_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`create_token failed: ${res.status}`);
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) throw new Error('No session token in response');
  return token;
}

// ---- セッション作成（avatar_id を固定。必要時差し替え） ----
export async function createSession(sessionToken: string, avatar_id: string): Promise<HeygenSession> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      version: 'v2',
      quality: 'high',
      avatar_id,           // 例: 90115f9617...
      video_encoding: 'H264',
    }),
  });
  if (!res.ok) throw new Error(`streaming.new failed: ${res.status}`);
  const json = await res.json();
  const data = json?.data;
  if (!data?.session_id || !data?.url || !data?.access_token) {
    throw new Error('Invalid session response');
  }
  return data;
}

export async function startStreaming(sessionToken: string, session_id: string): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) throw new Error(`streaming.start failed: ${res.status}`);
}

export async function sendText(sessionToken: string, session_id: string, text: string, task_type: 'talk'|'repeat'='talk'): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ session_id, text, task_type }),
  });
  if (!res.ok) throw new Error(`streaming.task failed: ${res.status}`);
}

export async function stopStreaming(sessionToken: string, session_id: string): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) throw new Error(`streaming.stop failed: ${res.status}`);
}
  access_token: string;   // LiveKit Access Token
  session_token?: string; // chat WS 用のトークンが返る場合
};


