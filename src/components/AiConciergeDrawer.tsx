import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type ChatModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
type GroundingMode = 'none' | 'search' | 'maps';

interface GroundingCitation {
  title: string;
  uri: string;
  kind: 'web' | 'maps';
  snippet?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model: string;
  groundingMode: GroundingMode;
  citations?: GroundingCitation[];
}

interface LiveTranscriptLine {
  id: string;
  speaker: 'you' | 'concierge';
  text: string;
}

interface AiConciergeDrawerProps {
  open: boolean;
  onClose: () => void;
  dailyGoalMl: number;
  consumedMl: number;
  preferredColor: string;
  onShowToast: (msg: string) => void;
}

const QUICK_PROMPTS: { label: string; prompt: string; mode: GroundingMode }[] = [
  {
    label: 'Refill stations near me',
    prompt: 'Find nearby public water refill stations, parks, or scenic trails where I can refill my bottle.',
    mode: 'maps',
  },
  {
    label: 'Hydration & electrolyte science',
    prompt: 'What does recent sports nutrition research say about optimal daily hydration and electrolytes?',
    mode: 'search',
  },
  {
    label: 'Pick my bottle',
    prompt: 'Help me choose the best Waterholic bottle size and finish for college classes plus evening gym workouts.',
    mode: 'none',
  },
  {
    label: 'Check my daily hydration',
    prompt: 'Review my current daily hydration progress and suggest a simple schedule for the rest of today.',
    mode: 'none',
  },
];

function float32ToBase64Pcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64Pcm24k(base64: string, audioCtx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  const buffer = audioCtx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || '');
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = () => reject(new Error('Audio encoding failed.'));
    reader.readAsDataURL(blob);
  });
}

export function AiConciergeDrawer({
  open,
  onClose,
  dailyGoalMl,
  consumedMl,
  preferredColor,
  onShowToast,
}: AiConciergeDrawerProps) {
  const { user, cloudChatHistory, saveChatTurnToCloud } = useAuth();

  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');
  const [model, setModel] = useState<ChatModelId>('gemini-4-hydrogen');
  const [groundingMode, setGroundingMode] = useState<GroundingMode>('none');
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Welcome to the Waterholic Hydration Concierge. Ask me to match your ideal flask, research live hydration science with Google Search, locate nearby water refill stations on Google Maps, or switch to Live Voice for a real-time spoken conversation.',
      model: 'gemini-4-hydrogen',
      groundingMode: 'none',
    },
  ]);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Audio Transcription state (gemini-3.5-transcribe)
  const [isRecordingNote, setIsRecordingNote] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const noteRecRef = useRef<MediaRecorder | null>(null);
  const noteChunksRef = useRef<Blob[]>([]);

  // Live Voice Session state (gemini-3.8-live via WS /api/live)
  const [voiceState, setVoiceState] = useState<
    'idle' | 'connecting' | 'live' | 'error'
  >('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [liveTranscripts, setLiveTranscripts] = useState<LiveTranscriptLine[]>([]);

  const micMutedRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const hydratedFromCloudRef = useRef<boolean>(false);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  // Hydrate persisted chat history when a signed-in user opens the drawer
  useEffect(() => {
    if (user && cloudChatHistory.length > 0 && !hydratedFromCloudRef.current) {
      hydratedFromCloudRef.current = true;
      setMessages(
        cloudChatHistory.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          model: m.model,
          groundingMode: m.groundingMode,
        }))
      );
    }
    if (!user) {
      hydratedFromCloudRef.current = false;
    }
  }, [user, cloudChatHistory]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, liveTranscripts]);

  // Clean up Live Voice when drawer closes or unmounts
  const stopLiveVoice = () => {
    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }
    wsRef.current = null;

    try {
      processorRef.current?.disconnect();
    } catch {
      // ignore
    }
    processorRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (inputCtxRef.current && inputCtxRef.current.state !== 'closed') {
      void inputCtxRef.current.close();
    }
    inputCtxRef.current = null;

    if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
      void outputCtxRef.current.close();
    }
    outputCtxRef.current = null;

    setMicLevel(0);
    setVoiceState('idle');
  };

  useEffect(() => {
    if (!open && voiceState !== 'idle') {
      stopLiveVoice();
    }
  }, [open, voiceState]);

  useEffect(() => {
    return () => {
      stopLiveVoice();
    };
  }, []);

  const requestLocationIfNeeded = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    if (userCoords) return userCoords;
    if (!('geolocation' in navigator)) return null;
    setLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserCoords(coords);
          setLocating(false);
          resolve(coords);
        },
        () => {
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5500, maximumAge: 300000 }
      );
    });
  };

  const sendMessage = async (
    overrideText?: string,
    overrideMode?: GroundingMode
  ) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const activeMode = overrideMode ?? groundingMode;
    if (overrideMode) setGroundingMode(overrideMode);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      model: activeMode === 'none' ? model : 'gemini-4-hydrogen',
      groundingMode: activeMode,
    };

    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    if (!overrideText) setInput('');
    setSending(true);

    if (user) {
      void saveChatTurnToCloud({
        role: 'user',
        text,
        model: userMsg.model,
        groundingMode: activeMode,
      });
    }

    try {
      let coords = userCoords;
      if (activeMode === 'maps' && !coords) {
        coords = await requestLocationIfNeeded();
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextThread.map((m) => ({ role: m.role, text: m.text })),
          model,
          groundingMode: activeMode,
          userLocation: coords,
          userContext: {
            dailyGoalMl,
            consumedMl,
            preferredColor,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach Waterholic Concierge.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        model: data.model,
        groundingMode: data.groundingMode ?? activeMode,
        citations: Array.isArray(data.citations) ? data.citations : [],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (user) {
        void saveChatTurnToCloud({
          role: 'assistant',
          text: assistantMsg.text,
          model: assistantMsg.model,
          groundingMode: assistantMsg.groundingMode,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `I hit a snag: ${message}`,
          model,
          groundingMode: activeMode,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Voice Note Transcription into Chat Composer (gemini-3.5-transcribe)
  const toggleAudioTranscribe = async () => {
    if (isRecordingNote) {
      noteRecRef.current?.stop();
      setIsRecordingNote(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType });
      noteChunksRef.current = [];

      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) noteChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(noteChunksRef.current, { type: mimeType });
        if (blob.size < 200) return;
        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Transcription failed');
          if (data.transcript) {
            setInput((prev) =>
              prev.trim() ? `${prev.trim()} ${data.transcript}` : data.transcript
            );
            onShowToast('Audio transcribed to message box');
          }
        } catch (err) {
          onShowToast(
            err instanceof Error ? err.message : 'Audio transcription failed'
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      noteRecRef.current = rec;
      rec.start();
      setIsRecordingNote(true);
    } catch {
      onShowToast('Allow microphone access to transcribe voice notes');
    }
  };

  // Start Real-Time Bidirectional Voice Session (gemini-3.8-live)
  const startLiveVoice = async () => {
    setVoiceError(null);
    setVoiceState('connecting');
    setLiveTranscripts([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      await inputCtx.resume();
      await outputCtx.resume();
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
      wsRef.current = ws;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (micMutedRef.current) {
          setMicLevel(0);
          return;
        }
        const channel = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < channel.length; i += 16) {
          sum += Math.abs(channel[i]);
        }
        setMicLevel(Math.min(1, (sum / (channel.length / 16)) * 6));

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64 = float32ToBase64Pcm16(channel);
          wsRef.current.send(JSON.stringify({ audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string;
            audio?: string;
            text?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            setVoiceState('live');
          } else if (msg.type === 'audio' && msg.audio && outputCtxRef.current) {
            const ctx = outputCtxRef.current;
            const audioBuf = decodeBase64Pcm24k(msg.audio, ctx);
            const srcNode = ctx.createBufferSource();
            srcNode.buffer = audioBuf;
            srcNode.connect(ctx.destination);

            const now = ctx.currentTime;
            if (nextStartTimeRef.current < now) {
              nextStartTimeRef.current = now + 0.03;
            }
            srcNode.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuf.duration;

            activeSourcesRef.current.add(srcNode);
            srcNode.onended = () => {
              activeSourcesRef.current.delete(srcNode);
            };
          } else if (msg.type === 'interrupted') {
            for (const src of activeSourcesRef.current) {
              try {
                src.stop();
              } catch {
                // ignore
              }
            }
            activeSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          } else if (msg.type === 'inputTranscript' && msg.text) {
            setLiveTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'you') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text}${msg.text}` },
                ];
              }
              return [
                ...prev,
                { id: `in-${Date.now()}`, speaker: 'you', text: msg.text! },
              ];
            });
          } else if (msg.type === 'outputTranscript' && msg.text) {
            setLiveTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'concierge') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text}${msg.text}` },
                ];
              }
              return [
                ...prev,
                {
                  id: `out-${Date.now()}`,
                  speaker: 'concierge',
                  text: msg.text!,
                },
              ];
            });
          } else if (msg.type === 'error') {
            setVoiceError(msg.message || 'Voice session encountered an error.');
            setVoiceState('error');
          } else if (msg.type === 'closed') {
            setVoiceState('idle');
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setVoiceError('Could not connect to live voice server.');
        setVoiceState('error');
      };

      ws.onclose = () => {
        setVoiceState((prev) => (prev === 'error' ? 'error' : 'idle'));
      };
    } catch (err) {
      stopLiveVoice();
      setVoiceError(
        err instanceof Error
          ? err.message
          : 'Microphone access is required for Live Voice.'
      );
      setVoiceState('error');
    }
  };

  if (!open) return null;

  return (
    <div
      className="concierge-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Waterholic AI Hydration Concierge"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="concierge-drawer">
        <div className="concierge-head">
          <div className="concierge-title-wrap">
            <span className="concierge-icon-badge" aria-hidden="true">
              <span className="concierge-icon-ring" aria-hidden="true" />
              <span className="concierge-icon-core" aria-hidden="true">
                <svg
                  className="concierge-icon-emblem"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="whConciergeDrawerGrad"
                      x1="6"
                      y1="4"
                      x2="26"
                      y2="28"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#7DD3FC" />
                      <stop offset="52%" stopColor="#A5B4FC" />
                      <stop offset="100%" stopColor="#F0F9FF" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M16 4.2C16 4.2 8.2 13.1 8.2 19.2C8.2 23.62 11.69 27.2 16 27.2C20.31 27.2 23.8 23.62 23.8 19.2C23.8 13.1 16 4.2 16 4.2Z"
                    stroke="url(#whConciergeDrawerGrad)"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.6 19.4V17.4M16 21.8V14.8M19.4 19.4V17.4"
                    stroke="url(#whConciergeDrawerGrad)"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5.4 14.2C4.6 16.8 5.2 19.8 6.8 22.1M26.6 14.2C27.4 16.8 26.8 19.8 25.2 22.1"
                    stroke="url(#whConciergeDrawerGrad)"
                    strokeOpacity="0.65"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
            <div>
              <h2>Waterholic AI Concierge</h2>
              <p>Hydration Coach · Search & Maps · Live Voice</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close AI Concierge"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs: Smart Chat vs Live Voice */}
        <div className="concierge-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chat'}
            className={`concierge-tab${activeTab === 'chat' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={15} aria-hidden="true" />
            Smart Chat & Grounding
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'voice'}
            className={`concierge-tab${activeTab === 'voice' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Volume2 size={15} aria-hidden="true" />
            Live Voice Call
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Model & Grounding Controls */}
            <div className="concierge-toolbar">
              <div className="concierge-grounding-group" role="group" aria-label="Grounding mode">
                <button
                  type="button"
                  className={`concierge-chip${groundingMode === 'none' ? ' is-active' : ''}`}
                  onClick={() => setGroundingMode('none')}
                >
                  <Compass size={13} aria-hidden="true" />
                  Concierge
                </button>
                <button
                  type="button"
                  className={`concierge-chip${groundingMode === 'search' ? ' is-active' : ''}`}
                  onClick={() => setGroundingMode('search')}
                >
                  <Globe size={13} aria-hidden="true" />
                  Web Search
                </button>
                <button
                  type="button"
                  className={`concierge-chip${groundingMode === 'maps' ? ' is-active' : ''}`}
                  onClick={() => setGroundingMode('maps')}
                >
                  <MapPin size={13} aria-hidden="true" />
                  Refill Maps
                </button>
              </div>

              <div className="concierge-model-select">
                <button
                  type="button"
                  className={`concierge-model-btn${model === 'gemini-4-hydrogen' ? ' is-active' : ''}`}
                  onClick={() => setModel('gemini-4-hydrogen')}
                  title="Balanced intelligence & grounding"
                >
                  Hydrogen
                </button>
                <button
                  type="button"
                  className={`concierge-model-btn${model === 'gemini-3.1-flash-lite' ? ' is-active' : ''}`}
                  onClick={() => setModel('gemini-3.1-flash-lite')}
                  title="Fastest response mode"
                  disabled={groundingMode !== 'none'}
                >
                  <Zap size={12} aria-hidden="true" />
                  Fast
                </button>
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div className="concierge-thread">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`concierge-msg concierge-msg-${msg.role}`}
                >
                  <div className="concierge-bubble">
                    {msg.role === 'assistant' && msg.groundingMode !== 'none' && (
                      <span className="concierge-source-tag">
                        {msg.groundingMode === 'maps'
                          ? 'Grounded with Google Maps'
                          : 'Grounded with Google Search'}
                      </span>
                    )}
                    <div className="concierge-text">{msg.text}</div>

                    {/* Grounding Citations & Maps Place Links */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="concierge-citations">
                        <span className="concierge-citations-label">
                          {msg.groundingMode === 'maps'
                            ? 'Verified Places on Google Maps'
                            : 'Verified Web Sources'}
                        </span>
                        <div className="concierge-citation-list">
                          {msg.citations.map((cit, i) => (
                            <a
                              key={`${cit.uri}-${i}`}
                              href={cit.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="concierge-citation-link"
                            >
                              {cit.kind === 'maps' ? (
                                <MapPin size={13} aria-hidden="true" />
                              ) : (
                                <Globe size={13} aria-hidden="true" />
                              )}
                              <span>{cit.title}</span>
                              <ExternalLink size={12} aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="concierge-msg concierge-msg-assistant">
                  <div className="concierge-bubble concierge-thinking">
                    {locating
                      ? 'Checking your location for nearby refill stations...'
                      : groundingMode === 'search'
                        ? 'Searching live hydration sources...'
                        : groundingMode === 'maps'
                          ? 'Finding verified places on Google Maps...'
                          : 'Thinking...'}
                  </div>
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="concierge-quick-row">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="concierge-quick-btn"
                  disabled={sending}
                  onClick={() => void sendMessage(q.prompt, q.mode)}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Composer with Inline Audio Transcription (gemini-3.5-transcribe) */}
            <form
              className="concierge-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
            >
              <button
                type="button"
                className={`concierge-mic-btn${isRecordingNote ? ' is-recording' : ''}`}
                onClick={toggleAudioTranscribe}
                disabled={isTranscribing || sending}
                aria-label={
                  isRecordingNote
                    ? 'Stop voice recording'
                    : 'Record voice message to transcribe'
                }
                title="Speak your question (Audio Transcription)"
              >
                {isRecordingNote ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isRecordingNote
                    ? 'Listening... tap mic again to transcribe'
                    : isTranscribing
                      ? 'Transcribing your audio...'
                      : groundingMode === 'maps'
                        ? 'Ask for refill stations, trails, or parks nearby...'
                        : groundingMode === 'search'
                          ? 'Ask a live web hydration question...'
                          : 'Ask about bottles, finishes, or hydration...'
                }
                className="concierge-input"
              />

              <button
                type="submit"
                className="concierge-send-btn"
                disabled={sending || !input.trim()}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          /* Real-Time Bidirectional Live Voice Interface (gemini-3.8-live) */
          <div className="concierge-voice-pane">
            <div className="concierge-voice-hero">
              <div
                className={`concierge-voice-orb${voiceState === 'live' ? ' is-live' : ''}`}
                style={{
                  transform: `scale(${1 + micLevel * 0.28})`,
                }}
              >
                <Volume2 size={32} aria-hidden="true" />
              </div>

              <h3>
                {voiceState === 'idle' && 'Talk Live with Waterholic'}
                {voiceState === 'connecting' && 'Connecting live voice...'}
                {voiceState === 'live' &&
                  (micMuted ? 'Microphone Muted' : 'Listening · Speak Naturally')}
                {voiceState === 'error' && 'Voice Connection Paused'}
              </h3>
              <p>
                Real-time bidirectional voice coaching. Ask about bottle sizes,
                campus hydration habits, thermal specs, or gift picks hands-free.
              </p>

              {voiceError && (
                <div className="creativelab-error" role="alert">
                  {voiceError}
                </div>
              )}

              <div className="concierge-voice-actions">
                {voiceState === 'idle' || voiceState === 'error' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startLiveVoice}
                  >
                    <Mic size={16} aria-hidden="true" />
                    Start Live Voice Conversation
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`btn btn-ghost${micMuted ? ' is-active' : ''}`}
                      onClick={() => setMicMuted((m) => !m)}
                    >
                      {micMuted ? (
                        <>
                          <MicOff size={16} aria-hidden="true" /> Unmute
                        </>
                      ) : (
                        <>
                          <Mic size={16} aria-hidden="true" /> Mute Mic
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn concierge-end-btn"
                      onClick={stopLiveVoice}
                    >
                      <PhoneOff size={16} aria-hidden="true" />
                      End Call
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Live Transcript Feed */}
            <div className="concierge-voice-transcript">
              <span className="config-label">Live Transcript</span>
              {liveTranscripts.length === 0 ? (
                <p className="concierge-voice-placeholder">
                  {voiceState === 'live'
                    ? 'Say "Hey Waterholic, help me pick an insulated bottle for hiking."'
                    : 'Start a live call to see real-time speech captions here.'}
                </p>
              ) : (
                <div className="concierge-voice-lines">
                  {liveTranscripts.map((line) => (
                    <div
                      key={line.id}
                      className={`concierge-voice-line is-${line.speaker}`}
                    >
                      <strong>
                        {line.speaker === 'you' ? 'You' : 'Waterholic'}
                      </strong>
                      <span>{line.text}</span>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
