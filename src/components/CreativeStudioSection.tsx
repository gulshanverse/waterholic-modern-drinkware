import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Download,
  Film,
  Image as ImageIcon,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  renderMotionReelVideo,
  type ReelChoreography,
} from '../utils/reelRenderer';

type LabMode = 'create-image' | 'edit-image' | 'text-video' | 'photo-video';
type AspectKey = '1:1' | '16:9' | '9:16' | '3:4' | '4:3';

interface CreativeStudioSectionProps {
  onShowToast: (msg: string) => void;
}

const IMAGE_PRESETS = [
  'Matte Ocean Blue WATERHOLIC bottle resting on dark volcanic basalt beside a misty Icelandic waterfall at dawn',
  'Limited-edition Rose Pink metallic WATERHOLIC flask with cherry blossom reflections on warm honed travertine',
  'Crystal Transparent borosilicate WATERHOLIC bottle filled with sparkling citrus ice cubes on a sunlit university library desk',
  'Alpine Sage insulated WATERHOLIC bottle strapped to a technical trail pack overlooking golden mountain ridges',
];

const VIDEO_PRESETS = [
  'Slow cinematic reveal of a chilled Ocean Blue WATERHOLIC bottle emerging from glacial mountain mist at sunrise',
  'Crisp water droplets splashing around a Rose Pink WATERHOLIC bottle in bright studio rim lighting',
  'College morning energy: sunlit campus quad table with a Transparent WATERHOLIC bottle catching golden rays',
];

async function fileToBase64(file: File): Promise<{ base64: string; mime: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx < 0) {
        reject(new Error('Invalid image file.'));
        return;
      }
      const header = dataUrl.slice(0, commaIdx);
      const mimeMatch = header.match(/data:([^;]+);base64/i);
      const mime = mimeMatch ? mimeMatch[1] : file.type || 'image/png';
      resolve({
        base64: dataUrl.slice(commaIdx + 1),
        mime,
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error('Could not read uploaded file.'));
    reader.readAsDataURL(file);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio.'));
    reader.readAsDataURL(blob);
  });
}

export function CreativeStudioSection({
  onShowToast,
}: CreativeStudioSectionProps) {
  const {
    user,
    cloudCreations,
    signInWithGoogle,
    saveCreationToCloud,
    deleteCreationFromCloud,
  } = useAuth();

  const [mode, setMode] = useState<LabMode>('create-image');
  const [prompt, setPrompt] = useState<string>(IMAGE_PRESETS[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectKey>('1:1');
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [enhancePhotoForVideo, setEnhancePhotoForVideo] = useState<boolean>(false);

  const [uploadedFile, setUploadedFile] = useState<{
    base64: string;
    mime: string;
    dataUrl: string;
    name: string;
  } | null>(null);

  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [renderPct, setRenderPct] = useState<number>(0);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultCaption, setResultCaption] = useState<string>('');
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultVideoFrame, setResultVideoFrame] = useState<string | null>(null);
  const [resultChoreography, setResultChoreography] =
    useState<ReelChoreography | null>(null);

  // Voice dictation for creative prompt (gemini-3.5-transcribe)
  const [isRecordingPrompt, setIsRecordingPrompt] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (resultVideoUrl) URL.revokeObjectURL(resultVideoUrl);
    };
  }, [resultVideoUrl]);

  const handleModeSwitch = (next: LabMode) => {
    setMode(next);
    setErrorMsg(null);
    if (next === 'create-image') {
      setPrompt(IMAGE_PRESETS[0]);
    } else if (next === 'edit-image') {
      setPrompt(
        'Change the bottle finish to metallic Rose Pink with soft morning mist and glowing studio rim light'
      );
    } else if (next === 'text-video') {
      setPrompt(VIDEO_PRESETS[0]);
    } else {
      setPrompt(
        'Gentle alpine breeze with sunlit water caustics shimmering across the scene'
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Please upload a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      setErrorMsg('Image must be under 9 MB.');
      return;
    }
    try {
      const encoded = await fileToBase64(file);
      setUploadedFile({ ...encoded, name: file.name });
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load photo.');
    }
  };

  const togglePromptDictation = async () => {
    if (isRecordingPrompt) {
      mediaRecRef.current?.stop();
      setIsRecordingPrompt(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
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
            setPrompt(data.transcript);
            onShowToast('Voice prompt transcribed cleanly');
          }
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Could not transcribe audio.'
          );
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecRef.current = rec;
      rec.start();
      setIsRecordingPrompt(true);
    } catch {
      setErrorMsg('Microphone permission is required for voice dictation.');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!prompt.trim()) {
      setErrorMsg('Please describe what you want to create.');
      return;
    }
    if (
      (mode === 'edit-image' || mode === 'photo-video') &&
      !uploadedFile
    ) {
      setErrorMsg('Please upload a photo first for this mode.');
      return;
    }

    setIsBusy(true);
    setRenderPct(0);

    try {
      if (mode === 'create-image' || mode === 'edit-image') {
        setStatusLabel(
          mode === 'edit-image'
            ? 'Editing your photo with Gemini Studio...'
            : 'Rendering your custom Waterholic design...'
        );
        const res = await fetch('/api/image/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            aspectRatio,
            sourceImageBase64:
              mode === 'edit-image' ? uploadedFile?.base64 : undefined,
            sourceImageMime:
              mode === 'edit-image' ? uploadedFile?.mime : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image generation failed.');

        setResultImageUrl(data.imageUrl);
        setResultCaption(data.caption || '');
        if (resultVideoUrl) {
          URL.revokeObjectURL(resultVideoUrl);
          setResultVideoUrl(null);
        }
        onShowToast(
          mode === 'edit-image'
            ? 'Custom photo edit ready'
            : 'Custom Waterholic design generated'
        );
      } else {
        // Text-to-Video OR Animate Uploaded Photo (100% Free-tier AI Keyframe + HD WebM Motion Reel)
        setStatusLabel(
          mode === 'text-video'
            ? 'Directing cinematic keyframe & motion choreography...'
            : 'Analyzing photo & directing motion choreography...'
        );
        const planRes = await fetch('/api/reel/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: mode === 'text-video' ? 'text-to-video' : 'photo-to-video',
            prompt: prompt.trim(),
            aspectRatio: videoAspect,
            sourceImageBase64:
              mode === 'photo-video' ? uploadedFile?.base64 : undefined,
            sourceImageMime:
              mode === 'photo-video' ? uploadedFile?.mime : undefined,
            enhancePhoto: enhancePhotoForVideo,
          }),
        });
        const planData = await planRes.json();
        if (!planRes.ok) {
          throw new Error(planData.error || 'Motion planning failed.');
        }

        setStatusLabel(`Encoding ${videoAspect} HD motion video clip...`);
        const rendered = await renderMotionReelVideo({
          frameDataUrl: planData.frameDataUrl,
          aspectRatio: videoAspect,
          choreography: planData.choreography,
          durationMs: 5600,
          onProgress: (pct) => setRenderPct(pct),
        });

        if (resultVideoUrl) URL.revokeObjectURL(resultVideoUrl);
        setResultVideoUrl(rendered.videoUrl);
        setResultVideoFrame(planData.frameDataUrl);
        setResultChoreography(planData.choreography);
        setResultImageUrl(null);
        onShowToast(`Motion video (${videoAspect}) ready to play & download`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong in the lab.'
      );
    } finally {
      setIsBusy(false);
      setStatusLabel('');
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
        onShowToast('Signed in! Click Save to Cloud again to store your design.');
      } catch {
        // user cancelled popup
      }
      return;
    }

    const preview =
      mode === 'create-image' || mode === 'edit-image'
        ? resultImageUrl
        : resultVideoFrame;
    if (!preview) return;

    try {
      await saveCreationToCloud({
        kind:
          mode === 'create-image'
            ? 'image'
            : mode === 'edit-image'
              ? 'edit'
              : 'reel',
        title:
          resultChoreography?.headline ||
          prompt.trim().slice(0, 64) ||
          'Waterholic Lab Design',
        prompt: prompt.trim(),
        aspectRatio:
          mode === 'text-video' || mode === 'photo-video'
            ? videoAspect
            : aspectRatio,
        previewDataUrl: preview,
      });
      onShowToast('Saved to your Waterholic Cloud Gallery');
    } catch {
      onShowToast('Could not save creation right now');
    }
  };

  const isVideoMode = mode === 'text-video' || mode === 'photo-video';
  const needsPhoto = mode === 'edit-image' || mode === 'photo-video';

  return (
    <section id="creative-lab" className="creativelab-section">
      <div className="container">
        <div className="creativelab-header">
          <div>
            <span className="section-kicker">Waterholic AI Creative Lab</span>
            <h2 className="section-title">Design, Restyle & Animate Your Bottle</h2>
            <p className="creativelab-lead">
              Generate bespoke Waterholic bottle concepts, edit your own photos, or
              animate text and snapshots into crisp 16:9 landscape or 9:16 vertical
              motion reels, completely free to create and download.
            </p>
          </div>
        </div>

        <div className="creativelab-tabs" role="tablist" aria-label="Creative Lab modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create-image'}
            className={`creativelab-tab${mode === 'create-image' ? ' is-active' : ''}`}
            onClick={() => handleModeSwitch('create-image')}
          >
            <ImageIcon size={16} aria-hidden="true" />
            Create Bottle Art
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'edit-image'}
            className={`creativelab-tab${mode === 'edit-image' ? ' is-active' : ''}`}
            onClick={() => handleModeSwitch('edit-image')}
          >
            <Wand2 size={16} aria-hidden="true" />
            Edit Uploaded Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'text-video'}
            className={`creativelab-tab${mode === 'text-video' ? ' is-active' : ''}`}
            onClick={() => handleModeSwitch('text-video')}
          >
            <Film size={16} aria-hidden="true" />
            Text-to-Video Reel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo-video'}
            className={`creativelab-tab${mode === 'photo-video' ? ' is-active' : ''}`}
            onClick={() => handleModeSwitch('photo-video')}
          >
            <Sparkles size={16} aria-hidden="true" />
            Animate Photo
          </button>
        </div>

        <div className="creativelab-grid">
          {/* Left Controls Panel */}
          <form className="creativelab-panel" onSubmit={handleGenerate}>
            {needsPhoto && (
              <div className="creativelab-upload-box">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="creativelab-photo-input"
                />
                {uploadedFile ? (
                  <div className="creativelab-upload-preview">
                    <img src={uploadedFile.dataUrl} alt="Uploaded source" />
                    <div className="creativelab-upload-meta">
                      <strong>{uploadedFile.name}</strong>
                      <div className="creativelab-upload-btns">
                        <button
                          type="button"
                          className="btn-card-ghost"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace Photo
                        </button>
                        <button
                          type="button"
                          className="bag-remove-btn"
                          onClick={() => setUploadedFile(null)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="creativelab-photo-input"
                    className="creativelab-dropzone"
                  >
                    <Upload size={22} aria-hidden="true" />
                    <span>
                      <strong>Upload a photo</strong> (PNG, JPEG, or WebP)
                    </span>
                    <small>
                      {mode === 'edit-image'
                        ? 'Restyle colors, add a Waterholic bottle, or change the lighting'
                        : 'Turn any still photo into a 16:9 or 9:16 animated motion clip'}
                    </small>
                  </label>
                )}
              </div>
            )}

            <div className="creativelab-field">
              <div className="creativelab-field-head">
                <label htmlFor="creativelab-prompt" className="config-label">
                  {mode === 'edit-image'
                    ? 'Edit Instruction'
                    : isVideoMode
                      ? 'Motion & Scene Direction'
                      : 'Custom Bottle Visual Prompt'}
                </label>
                <button
                  type="button"
                  className={`creativelab-mic-btn${isRecordingPrompt ? ' is-recording' : ''}`}
                  onClick={togglePromptDictation}
                  disabled={isTranscribing}
                  title="Dictate your prompt with your microphone"
                >
                  {isRecordingPrompt ? (
                    <>
                      <MicOff size={14} aria-hidden="true" /> Stop Mic
                    </>
                  ) : isTranscribing ? (
                    'Transcribing...'
                  ) : (
                    <>
                      <Mic size={14} aria-hidden="true" /> Voice Prompt
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="creativelab-prompt"
                rows={4}
                className="creativelab-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your Waterholic bottle design, lighting, or motion scene..."
              />
            </div>

            {/* Inspiration chips */}
            <div className="creativelab-presets">
              {(isVideoMode ? VIDEO_PRESETS : IMAGE_PRESETS)
                .slice(0, 3)
                .map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="creativelab-preset-btn"
                    onClick={() => setPrompt(p)}
                  >
                    {p.slice(0, 56)}…
                  </button>
                ))}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="creativelab-field">
              <span className="config-label">
                {isVideoMode ? 'Video Aspect Ratio' : 'Image Aspect Ratio'}
              </span>
              {isVideoMode ? (
                <div className="option-row">
                  <button
                    type="button"
                    className={`pill-option${videoAspect === '16:9' ? ' is-active' : ''}`}
                    onClick={() => setVideoAspect('16:9')}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    type="button"
                    className={`pill-option${videoAspect === '9:16' ? ' is-active' : ''}`}
                    onClick={() => setVideoAspect('9:16')}
                  >
                    9:16 Portrait (Stories)
                  </button>
                </div>
              ) : (
                <div className="option-row">
                  {(['1:1', '16:9', '9:16', '3:4', '4:3'] as AspectKey[]).map(
                    (ar) => (
                      <button
                        key={ar}
                        type="button"
                        className={`pill-option${aspectRatio === ar ? ' is-active' : ''}`}
                        onClick={() => setAspectRatio(ar)}
                      >
                        {ar}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {mode === 'photo-video' && (
              <label className="creativelab-checkbox-row">
                <input
                  type="checkbox"
                  checked={enhancePhotoForVideo}
                  onChange={(e) => setEnhancePhotoForVideo(e.target.checked)}
                />
                <span>Apply AI cinematic relighting before animating</span>
              </label>
            )}

            {errorMsg && (
              <div className="creativelab-error" role="alert">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isBusy}
            >
              {isBusy
                ? renderPct > 0
                  ? `${statusLabel} (${renderPct}%)`
                  : statusLabel || 'Creating...'
                : mode === 'create-image'
                  ? 'Generate Custom Bottle Design'
                  : mode === 'edit-image'
                    ? 'Apply AI Photo Edit'
                    : mode === 'text-video'
                      ? `Generate ${videoAspect} Motion Video`
                      : `Animate Photo (${videoAspect})`}
            </button>
          </form>

          {/* Right Output Stage */}
          <div className="creativelab-stage">
            {isBusy ? (
              <div className="creativelab-loading">
                <div className="creativelab-spinner" aria-hidden="true" />
                <p>{statusLabel || 'Working in the Waterholic AI Lab...'}</p>
                {renderPct > 0 && (
                  <div className="creativelab-progress-track">
                    <div
                      className="creativelab-progress-fill"
                      style={{ width: `${renderPct}%` }}
                    />
                  </div>
                )}
              </div>
            ) : resultVideoUrl ? (
              <div className="creativelab-output">
                <video
                  src={resultVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className={`creativelab-video${
                    videoAspect === '9:16' ? ' is-portrait' : ''
                  }`}
                />
                {resultChoreography && (
                  <div className="creativelab-video-meta">
                    <strong>{resultChoreography.headline}</strong>
                    <span>{resultChoreography.subline}</span>
                  </div>
                )}
                <div className="creativelab-output-actions">
                  <a
                    href={resultVideoUrl}
                    download={`waterholic-reel-${videoAspect.replace(':', 'x')}.webm`}
                    className="btn btn-primary"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download Video
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleSaveToCloud}
                  >
                    <Cloud size={16} aria-hidden="true" />
                    {user ? 'Save to Cloud Gallery' : 'Sign In to Save'}
                  </button>
                </div>
              </div>
            ) : resultImageUrl ? (
              <div className="creativelab-output">
                <img
                  src={resultImageUrl}
                  alt="Generated Waterholic AI bottle design"
                  className="creativelab-image"
                />
                {resultCaption && (
                  <p className="creativelab-caption">{resultCaption}</p>
                )}
                <div className="creativelab-output-actions">
                  <a
                    href={resultImageUrl}
                    download={`waterholic-studio-${Date.now()}.png`}
                    className="btn btn-primary"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download PNG
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleSaveToCloud}
                  >
                    <Cloud size={16} aria-hidden="true" />
                    {user ? 'Save to Cloud Gallery' : 'Sign In to Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="creativelab-empty">
                <Sparkles size={32} aria-hidden="true" />
                <h3>Your Creation Appears Here</h3>
                <p>
                  Choose a mode on the left, speak or type your vision, and generate
                  studio-grade bottle artwork, photo edits, or downloadable 16:9 / 9:16
                  motion videos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cloud-Synced Saved Creations Gallery (Firebase Firestore) */}
        {user && cloudCreations.length > 0 && (
          <div className="creativelab-gallery">
            <div className="creativelab-gallery-head">
              <h3>Your Saved Cloud Creations ({cloudCreations.length})</h3>
              <span>Synced automatically to your Waterholic account</span>
            </div>
            <div className="creativelab-gallery-grid">
              {cloudCreations.map((item) => (
                <article key={item.id} className="creativelab-gallery-card">
                  {item.previewDataUrl && (
                    <img
                      src={item.previewDataUrl}
                      alt={item.title}
                      className="creativelab-gallery-thumb"
                    />
                  )}
                  <div className="creativelab-gallery-body">
                    <span className="creativelab-gallery-kind">
                      {item.kind === 'reel'
                        ? `Motion Reel · ${item.aspectRatio}`
                        : item.kind === 'edit'
                          ? `Photo Edit · ${item.aspectRatio}`
                          : `Bottle Art · ${item.aspectRatio}`}
                    </span>
                    <h4>{item.title}</h4>
                    <div className="creativelab-gallery-actions">
                      {item.previewDataUrl && (
                        <a
                          href={item.previewDataUrl}
                          download={`waterholic-${item.id}.png`}
                          className="btn-card-ghost"
                        >
                          Download
                        </a>
                      )}
                      <button
                        type="button"
                        className="bag-remove-btn"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => void deleteCreationFromCloud(item.id)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
