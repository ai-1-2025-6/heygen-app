
<!-- src/components/HeygenLive.vue -->
<template>
  <div class="space-y-3">
    <div class="flex gap-2">
      <button
        class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        :disabled="busy || !!room"
        @click="handleStart"
      >
        Start
      </button>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        :disabled="busy || !room"
        @click="handleStop"
      >
        Stop
      </button>
      <input
        class="flex-1 min-w-[200px] p-2 border rounded"
        placeholder="Talk text"
        v-model="text"
      />
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="!room || !session || busy"
        @click="handleSend"
      >
        Send
      </button>
    </div>

    <video ref="videoRef" class="w-full max-h-[400px] border rounded" autoplay controls />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { Room, RoomEvent, Track, TrackPublication, RemoteParticipant } from 'livekit-client';

const SERVER_URL = import.meta.env.VITE_HEYGEN_SERVER_URL as string;
const API_KEY    = import.meta.env.VITE_HEYGEN_API_KEY as string;
const DEFAULT_AVATAR_ID = '90115f9617174150b47bbdbb776e5408';

type HeygenSession = {
  session_id: string;
  url: string;
  access_token: string;
  session_token?: string;
};

const videoRef = ref<HTMLVideoElement | null>(null);
const sessionToken = ref<string | null>(null);
const session = ref<HeygenSession | null>(null);
const room = ref<Room | null>(null);
const mediaStream = new MediaStream();

const text = ref('');
const busy = ref(false);

async function createSessionToken(): Promise<string> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.create_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
  });
  if (!res.ok) throw new Error(`create_token failed: ${res.status}`);
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) throw new Error('No session token');
  return token;
}

async function createSessionReq(token: string, avatar_id: string): Promise<HeygenSession> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ version: 'v2', quality: 'high', avatar_id, video_encoding: 'H264' }),
  });
  if (!res.ok) throw new Error(`streaming.new failed: ${res.status}`);
  const json = await res.json();
  const data = json?.data;
  if (!data?.session_id || !data?.url || !data?.access_token) throw new Error('Invalid session response');
  return data;
}

async function startStreamingReq(token: string, session_id: string): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) throw new Error(`streaming.start failed: ${res.status}`);
}

async function sendTextReq(token: string, session_id: string, t: string, type: 'talk'|'repeat'='talk'): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_id, text: t, task_type: type }),
  });
  if (!res.ok) throw new Error(`streaming.task failed: ${res.status}`);
}

async function stopStreamingReq(token: string, session_id: string): Promise<void> {
  const res = await fetch(`${SERVER_URL}/v1/streaming.stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) throw new Error(`streaming.stop failed: ${res.status}`);
}

async function handleStart() {
  try {
    busy.value = true;
    const token = await createSessionToken();
    sessionToken.value = token;

    const s = await createSessionReq(token, DEFAULT_AVATAR_ID);
    session.value = s;

    await startStreamingReq(token, s.session_id);

    const r = new Room();
    await r.connect(s.url, s.access_token);
    room.value = r;

    r.on(RoomEvent.TrackSubscribed, (track: Track, _pub: TrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        mediaStream.addTrack(track.mediaStreamTrack);
        if (videoRef.value) {
          videoRef.value.srcObject = mediaStream;
          videoRef.value.playsInline = true;
          videoRef.value.play().catch(() => {});
        }
      }
    });

    r.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
      const mt = track.mediaStreamTrack;
      if (mt) mediaStream.removeTrack(mt);
    });
  } catch (e: any) {
    console.error(e);
    alert(`Start failed: ${e.message ?? e}`);
  } finally {
    busy.value = false;
  }
}

async function handleStop() {
  try {
    busy.value = true;
    if (session.value && sessionToken.value) {
      await stopStreamingReq(sessionToken.value, session.value.session_id);
    }
  } catch (e) {
    console.error(e);
  } finally {
    room.value?.disconnect();
    room.value = null;
    session.value = null;
    sessionToken.value = null;
    mediaStream.getTracks().forEach(t => t.stop());
    if (videoRef.value) videoRef.value.srcObject = null;
    busy.value = false;
  }
}

async function handleSend() {
  if (!session.value || !sessionToken.value || !text.value.trim()) return;
  try {
    await sendTextReq(sessionToken.value, session.value.session_id, text.value.trim(), 'talk');
    text.value = '';
  } catch (e: any) {
    console.error(e);
    alert(`Send failed: ${e.message ?? e}`);
  }
}

onUnmounted(() => {
  room.value?.disconnect();
  mediaStream.getTracks().forEach(t => t.stop());
});
</script>

