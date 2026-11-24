import { GoogleGenAI, Modality, type Content, type LiveServerMessage } from '@google/genai';

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '3:4', '4:3']);
const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/ogg;codecs=opus',
]);

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export const WATERHOLIC_SYSTEM_INSTRUCTION = `You are the Waterholic Hydration Concierge — a sharp, warm, knowledgeable hydration scientist and product specialist for Waterholic, a modern hydration gear brand.

Key Waterholic catalog facts you know:
- 120 curated water essentials across 8 categories: Insulated Steel Bottles, Sports & Gym Jugs, Borosilicate Glass Bottles, Purifiers & Filters (including UV-C self-cleaning caps), Home Pitchers & Dispensers, Mineral & Spring Water, Tumblers & Deskware, and Clear Iceware & Hydration Accessories.
- Every bottle offers 6 signature colour finishes: Ocean Blue, Rose Pink (Premium Rose Quartz Edition), Transparent, Alpine Sage, Basalt Black, and Glacier Silver — each laser-etched with the WATERHOLIC droplet emblem.
- Signature insulation: 24 hours ice-cold, 12 hours piping hot, 18/8 pro-grade double-wall stainless steel, zero condensation, lifetime replacement warranty.
- College Campus Edition: verified .edu students unlock 15% off automatically plus curated Dorm & Study Hydration Bundles.
- Users also have a Daily Hydration Tracker in their Web Profile, an interactive 3D Bottle Studio, and an AI Creative Lab on the site.

Guidelines:
- Keep answers concise, practical, and structured with clean markdown (short bullets or bold highlights where helpful).
- Recommend specific Waterholic product types, sizes (750 ml, 950 ml, 1.2 L), or hydration habits tailored to the user's lifestyle.
- Never invent fake order tracking numbers or private data. If grounding tools (Google Search or Google Maps) are active, cite real verified facts and local spots naturally.`;

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatRequestParams {
  messages: ChatTurnInput[];
  model?: string;
  groundingMode?: 'none' | 'search' | 'maps';
  userLocation?: { latitude: number; longitude: number } | null;
  userContext?: {
    dailyGoalMl?: number;
    consumedMl?: number;
    preferredColor?: string;
  };
}

export interface GroundingCitation {
  title: string;
  uri: string;
  kind: 'web' | 'maps';
  snippet?: string;
}

export async function runWaterholicChat(params: ChatRequestParams) {
  const ai = getGeminiClient();
  const groundingMode = params.groundingMode ?? 'none';

  // Grounding tools require gemini-4-hydrogen
  let model =
    params.model && ALLOWED_CHAT_MODELS.has(params.model)
      ? params.model
      : 'gemini-4-hydrogen';
  if (groundingMode === 'search' || groundingMode === 'maps') {
    model = 'gemini-4-hydrogen';
  }

  const sanitizedMessages = (params.messages ?? [])
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.text === 'string' &&
        m.text.trim().length > 0
    )
    .slice(-16);

  if (sanitizedMessages.length === 0) {
    throw new Error('At least one message is required.');
  }

  const contents: Content[] = sanitizedMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text.slice(0, 6000) }],
  }));

  let systemInstruction = WATERHOLIC_SYSTEM_INSTRUCTION;
  if (params.userContext) {
    const { dailyGoalMl, consumedMl, preferredColor } = params.userContext;
    systemInstruction += `\n\nCurrent user hydration snapshot: consumed ${consumedMl ?? 0} ml of ${dailyGoalMl ?? 2500} ml daily goal; favorite finish: ${preferredColor ?? 'Ocean Blue'}.`;
  }

  const config: Record<string, unknown> = {
    systemInstruction,
  };

  if (groundingMode === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (groundingMode === 'maps') {
    config.tools = [{ googleMaps: {} }];
    if (
      params.userLocation &&
      Number.isFinite(params.userLocation.latitude) &&
      Number.isFinite(params.userLocation.longitude)
    ) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: params.userLocation.latitude,
            longitude: params.userLocation.longitude,
          },
        },
      };
    }
  }

  // Note: Do NOT pass temperature, topP, topK, candidateCount, or thinkingBudget to gemini-4-hydrogen
  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const citations: GroundingCitation[] = [];
  const seenUris = new Set<string>();
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: string; title?: string } }).web;
    if (web?.uri && !seenUris.has(web.uri)) {
      seenUris.add(web.uri);
      citations.push({
        title: web.title || web.uri,
        uri: web.uri,
        kind: 'web',
      });
    }
    const maps = (
      chunk as {
        maps?: {
          uri?: string;
          title?: string;
          placeAnswerSources?: {
            reviewSnippets?: { content?: string; uri?: string }[];
          };
        };
      }
    ).maps;
    if (maps?.uri && !seenUris.has(maps.uri)) {
      seenUris.add(maps.uri);
      const firstSnippet =
        maps.placeAnswerSources?.reviewSnippets?.[0]?.content;
      citations.push({
        title: maps.title || 'View on Google Maps',
        uri: maps.uri,
        kind: 'maps',
        snippet: firstSnippet,
      });
    }
  }

  return {
    text: response.text || 'I could not generate a response right now. Please try again.',
    model,
    groundingMode,
    citations,
  };
}

export async function transcribeUserAudio(
  base64Audio: string,
  mimeType: string
) {
  const ai = getGeminiClient();
  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_AUDIO_MIMES.has(normalizedMime)) {
    throw new Error('Unsupported audio format for transcription.');
  }
  if (!base64Audio || base64Audio.length > 16_000_000) {
    throw new Error('Audio payload is empty or exceeds size limit.');
  }

  const baseMime = normalizedMime.split(';')[0];
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: baseMime,
            data: base64Audio,
          },
        },
        {
          text: 'Transcribe this spoken audio cleanly and accurately into plain text without timestamps or extra commentary.',
        },
      ],
    },
  });

  return {
    transcript: (response.text ?? '').trim(),
    model: 'gemini-3.5-transcribe',
  };
}

export interface StudioImageParams {
  prompt: string;
  aspectRatio?: string;
  sourceImageBase64?: string;
  sourceImageMime?: string;
}

export async function generateOrEditStudioImage(params: StudioImageParams) {
  const ai = getGeminiClient();
  const cleanPrompt = (params.prompt ?? '').trim().slice(0, 1200);
  if (!cleanPrompt) {
    throw new Error('Please enter a visual prompt.');
  }

  const aspectRatio =
    params.aspectRatio && ALLOWED_ASPECT_RATIOS.has(params.aspectRatio)
      ? params.aspectRatio
      : '1:1';

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];

  const isEdit = Boolean(params.sourceImageBase64 && params.sourceImageMime);
  if (isEdit) {
    const mime = params.sourceImageMime!.toLowerCase().trim();
    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      throw new Error('Unsupported image type. Use PNG, JPEG, or WebP.');
    }
    if (params.sourceImageBase64!.length > 14_000_000) {
      throw new Error('Uploaded image is too large (max ~10 MB).');
    }
    parts.push({
      inlineData: {
        data: params.sourceImageBase64!,
        mimeType: mime,
      },
    });
    parts.push({
      text: `Edit this image cleanly with studio product photography fidelity: ${cleanPrompt}. Preserve natural lighting and crisp Waterholic bottle geometry if a bottle is present.`,
    });
  } else {
    parts.push({
      text: `Commercial studio photography for the hydration brand WATERHOLIC featuring a sleek modern bottle engraved with the crisp wordmark "WATERHOLIC" and droplet mark: ${cleanPrompt}. Ultra-clean lighting, refined editorial composition, no cluttered text overlays.`,
    });
  }

  // Free-tier default image generation & editing model
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio,
      },
    },
  });

  let imageUrl = '';
  let caption = '';
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data && !imageUrl) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      imageUrl = `data:${mime};base64,${part.inlineData.data}`;
    } else if (part.text) {
      caption += part.text;
    }
  }

  if (!imageUrl) {
    throw new Error('No image was returned for that prompt. Try rephrasing slightly.');
  }

  return {
    imageUrl,
    caption: caption.trim(),
    model: 'gemini-3.1-flash-lite-image',
    mode: isEdit ? 'edit' : 'generate',
    aspectRatio,
  };
}

export interface MotionReelPlanParams {
  mode: 'text-to-video' | 'photo-to-video';
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  sourceImageBase64?: string;
  sourceImageMime?: string;
  enhancePhoto?: boolean;
}

export async function createMotionReelPlan(params: MotionReelPlanParams) {
  const ai = getGeminiClient();
  const cleanPrompt = (params.prompt ?? '').trim().slice(0, 1000);
  if (!cleanPrompt) {
    throw new Error('Please describe the motion scene you want to create.');
  }
  const aspectRatio: '16:9' | '9:16' =
    params.aspectRatio === '9:16' ? '9:16' : '16:9';

  // 1. Direct choreography & kinetic copy using free gemini-4-hydrogen
  const directorPromise = ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Create a short 6-second commercial video choreography plan for Waterholic based on this scene: "${cleanPrompt}".
Return ONLY raw JSON (no markdown fences) with these exact keys:
{
  "headline": "3 to 5 punchy uppercase words",
  "subline": "Short 6 to 10 word editorial tagline",
  "cameraMove": "zoom-in" | "pan-right" | "pan-up" | "orbit-drift",
  "effect": "water-caustics" | "mist-particles" | "sun-flare" | "alpine-shimmer",
  "accentHex": "#0284C7"
}`,
  });

  // 2. Keyframe image: generate new frame for text-to-video, or optionally enhance uploaded photo
  let framePromise: Promise<string>;
  if (params.mode === 'text-to-video') {
    framePromise = generateOrEditStudioImage({
      prompt: `Cinematic wide film still for a commercial spot: ${cleanPrompt}. Atmospheric lighting, ultra crisp Waterholic bottle hero subject, depth of field.`,
      aspectRatio,
    }).then((res) => res.imageUrl);
  } else if (
    params.enhancePhoto &&
    params.sourceImageBase64 &&
    params.sourceImageMime
  ) {
    framePromise = generateOrEditStudioImage({
      prompt: `Cinematic film grade and atmospheric lighting enhancement for animation: ${cleanPrompt}`,
      aspectRatio,
      sourceImageBase64: params.sourceImageBase64,
      sourceImageMime: params.sourceImageMime,
    }).then((res) => res.imageUrl);
  } else if (params.sourceImageBase64 && params.sourceImageMime) {
    framePromise = Promise.resolve(
      `data:${params.sourceImageMime};base64,${params.sourceImageBase64}`
    );
  } else {
    throw new Error('Please upload a starting photo to animate.');
  }

  const [directorRes, frameDataUrl] = await Promise.all([
    directorPromise,
    framePromise,
  ]);

  let choreography = {
    headline: 'ENGINEERED TO FLOW',
    subline: 'Pure hydration built for every mile ahead.',
    cameraMove: 'zoom-in' as 'zoom-in' | 'pan-right' | 'pan-up' | 'orbit-drift',
    effect: 'water-caustics' as
      | 'water-caustics'
      | 'mist-particles'
      | 'sun-flare'
      | 'alpine-shimmer',
    accentHex: '#0284C7',
  };

  try {
    const raw = (directorRes.text ?? '')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(raw);
    if (typeof parsed.headline === 'string' && parsed.headline.trim()) {
      choreography.headline = parsed.headline.trim().slice(0, 48);
    }
    if (typeof parsed.subline === 'string' && parsed.subline.trim()) {
      choreography.subline = parsed.subline.trim().slice(0, 90);
    }
    if (
      ['zoom-in', 'pan-right', 'pan-up', 'orbit-drift'].includes(
        parsed.cameraMove
      )
    ) {
      choreography.cameraMove = parsed.cameraMove;
    }
    if (
      [
        'water-caustics',
        'mist-particles',
        'sun-flare',
        'alpine-shimmer',
      ].includes(parsed.effect)
    ) {
      choreography.effect = parsed.effect;
    }
    if (
      typeof parsed.accentHex === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(parsed.accentHex)
    ) {
      choreography.accentHex = parsed.accentHex;
    }
  } catch {
    // Keep crisp defaults if JSON parsing fails
  }

  return {
    frameDataUrl,
    aspectRatio,
    choreography,
    models: ['gemini-3.1-flash-lite-image', 'gemini-4-hydrogen'],
  };
}

export async function connectWaterholicLiveSession(callbacks: {
  onAudio: (base64Pcm24k: string) => void;
  onInterrupted: () => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
}) {
  const ai = getGeminiClient();

  const session = await ai.live.connect({
    model: 'gemini-3.8-live',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: `${WATERHOLIC_SYSTEM_INSTRUCTION}\n\nYou are speaking live in a real-time voice conversation. Keep your spoken responses natural, conversational, warm, and concise (2 to 4 sentences per turn unless asked for more detail).`,
    },
    callbacks: {
      onmessage: (message: LiveServerMessage) => {
        const content = message.serverContent;
        if (!content) return;

        if (content.inputTranscription?.text) {
          callbacks.onInputTranscript(content.inputTranscription.text);
        }
        if (content.outputTranscription?.text) {
          callbacks.onOutputTranscript(content.outputTranscription.text);
        }

        for (const part of content.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) {
            callbacks.onAudio(part.inlineData.data);
          }
        }

        if (content.interrupted) {
          callbacks.onInterrupted();
        }
      },
      onerror: (err: unknown) => {
        callbacks.onError(err);
      },
      onclose: () => {
        callbacks.onClose();
      },
    },
  });

  return session;
}
