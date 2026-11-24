import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  connectWaterholicLiveSession,
  createMotionReelPlan,
  generateOrEditStudioImage,
  runWaterholicChat,
  transcribeUserAudio,
} from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Allow base64 image & audio payloads up to 18MB cleanly
  app.use(express.json({ limit: '18mb' }));

  // Health probe
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Multi-turn Gemini Chatbot + Google Search Grounding + Google Maps Grounding
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, model, groundingMode, userLocation, userContext } =
        req.body ?? {};
      const result = await runWaterholicChat({
        messages,
        model,
        groundingMode,
        userLocation,
        userContext,
      });
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach AI Concierge.';
      console.error('[POST /api/chat] error:', message);
      res.status(500).json({ error: message });
    }
  });

  // 2. Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body ?? {};
      const result = await transcribeUserAudio(
        String(audioBase64 ?? ''),
        String(mimeType ?? 'audio/webm')
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to transcribe audio.';
      console.error('[POST /api/transcribe] error:', message);
      res.status(500).json({ error: message });
    }
  });

  // 3. Create & Edit Images (gemini-3.1-flash-lite-image)
  app.post('/api/image/studio', async (req, res) => {
    try {
      const { prompt, aspectRatio, sourceImageBase64, sourceImageMime } =
        req.body ?? {};
      const result = await generateOrEditStudioImage({
        prompt: String(prompt ?? ''),
        aspectRatio: aspectRatio ? String(aspectRatio) : '1:1',
        sourceImageBase64: sourceImageBase64
          ? String(sourceImageBase64)
          : undefined,
        sourceImageMime: sourceImageMime ? String(sourceImageMime) : undefined,
      });
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate image.';
      console.error('[POST /api/image/studio] error:', message);
      res.status(500).json({ error: message });
    }
  });

  // 4. Free-tier AI Motion Reel Planner (Text-to-Video & Photo-to-Video choreography + keyframe)
  app.post('/api/reel/plan', async (req, res) => {
    try {
      const {
        mode,
        prompt,
        aspectRatio,
        sourceImageBase64,
        sourceImageMime,
        enhancePhoto,
      } = req.body ?? {};
      const result = await createMotionReelPlan({
        mode: mode === 'photo-to-video' ? 'photo-to-video' : 'text-to-video',
        prompt: String(prompt ?? ''),
        aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
        sourceImageBase64: sourceImageBase64
          ? String(sourceImageBase64)
          : undefined,
        sourceImageMime: sourceImageMime ? String(sourceImageMime) : undefined,
        enhancePhoto: Boolean(enhancePhoto),
      });
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to prepare motion reel.';
      console.error('[POST /api/reel/plan] error:', message);
      res.status(500).json({ error: message });
    }
  });

  // 5. Real-Time Voice Conversations WebSocket Bridge (gemini-3.8-live)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(
      request.url || '/',
      `http://${request.headers.host || 'localhost'}`
    ).pathname;

    if (pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    let closed = false;
    let session: Awaited<ReturnType<typeof connectWaterholicLiveSession>> | null =
      null;

    const safeSend = (payload: Record<string, unknown>) => {
      if (!closed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      session = await connectWaterholicLiveSession({
        onAudio: (audio) => safeSend({ type: 'audio', audio }),
        onInterrupted: () => safeSend({ type: 'interrupted' }),
        onInputTranscript: (text) => safeSend({ type: 'inputTranscript', text }),
        onOutputTranscript: (text) =>
          safeSend({ type: 'outputTranscript', text }),
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : 'Live voice connection error.';
          safeSend({ type: 'error', message: msg });
        },
        onClose: () => {
          safeSend({ type: 'closed' });
        },
      });
      safeSend({ type: 'ready' });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Could not initialize real-time voice session.';
      safeSend({ type: 'error', message: msg });
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session || closed) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.text) {
          session.sendRealtimeInput({ text: msg.text.slice(0, 1000) });
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    clientWs.on('close', () => {
      closed = true;
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
      session = null;
    });
  });

  // Mount Vite middleware in development, static dist in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Waterholic full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Waterholic server:', err);
  process.exit(1);
});
