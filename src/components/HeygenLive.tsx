
// src/components/HeygenLive.tsx
import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, TrackPublication, RemoteParticipant } from 'livekit-client';
import {
  HeygenSession,  createSessionToken,
} from '../lib/heygen';

// 最小構成なので avatar_id は固定。必要に応じ差し替え。
const DEFAULT_AVATAR_ID = '90115f9617174150b47bbdbb776e5408';

export default function HeygenLive() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [session, setSession] = useState<HeygenSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [mediaStream] = useState(() => new MediaStream());

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // --- Start ---
  const handleStart = async () => {
    try {
      setBusy(true);

      // 1) トークン作成（暫定）
      const token = await createSessionToken();
      setSessionToken(token);

      // 2) セッション作成
      const s = await createSession(token, DEFAULT_AVATAR_ID);
      setSession(s);

      // 3) ストリーミング開始
      await startStreaming(token, s.session_id);

      // 4) LiveKit 接続 & トラック購読
      const r = new Room();
      await r.connect(s.url, s.access_token);
      setRoom(r);

      r.on(RoomEvent.TrackSubscribed, (track: Track, _pub: TrackPublication, _p: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          mediaStream.addTrack(track.mediaStreamTrack);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.playsInline = true;
            // iOS/Safari はユーザー操作後に play 必要な場合あり
            videoRef.current.play().catch(() => {});
          }
        }
      });

      r.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        const mt = track.mediaStreamTrack;
        if (mt) mediaStream.removeTrack(mt);
      });
    } catch (e) {
      console.error(e);
      alert(`Start failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // --- Stop ---
  const handleStop = async () => {
    try {
      setBusy(true);
      if (session && sessionToken) {
        await stopStreaming(sessionToken, session.session_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      room?.disconnect();
      setRoom(null);
      setSession(null);
      setSessionToken(null);
      mediaStream.getTracks().forEach(t => t.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setBusy(false);
    }
  };

  // --- Talk ---
  const handleSend = async () => {
    if (!session || !sessionToken || !text.trim()) return;
    try {
      await sendText(sessionToken, session.session_id, text.trim(), 'talk');
      setText('');
    } catch (e) {
      console.error(e);
      alert(`Send failed: ${(e as Error).message}`);
    }
  };

  // クリーンアップ（コンポーネント unmount 時）
  useEffect(() => {
    return () => {
      room?.disconnect();
      mediaStream.getTracks().forEach(t => t.stop());
    };
  }, [room, mediaStream]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          onClick={handleStart}
          disabled={busy || !!room}
        >
          Start
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          onClick={handleStop}
          disabled={busy || !room}
        >
          Stop
        </button>
        <input
          className="flex-1 min-w-[200px] p-2 border rounded"
          placeholder="Talk text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleSend}
          disabled={!room || !session || busy}
        >
          Send
        </button>
      </div>

      <video
        ref={videoRef}
        className="w-full max-h-[400px] border rounded"
        autoPlay
        controls
      />
    </div>
  );
}
  createSession,
  startStreaming,
  sendText,
  stopStreaming,

