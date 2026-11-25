import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import QRCode from 'qrcode';
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Move,
  QrCode,
  RefreshCw,
  Ruler,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import {
  SIZE_SPECS,
  STUDIO_FINISHES,
  createContactShadowTexture,
  createDeskReferenceProps,
  createGymBenchTexture,
  createGymReferenceProps,
  createProceduralArBottle,
  createWalnutDeskTexture,
  type StudioFinishKey,
  type StudioSizeKey,
} from '../utils/bottle3dSpecs';
import { triggerAddToBagHaptic, triggerMicroHapticTick } from '../utils/hapticFeedback';

export type ArPreviewMode = 'desk' | 'camera' | 'qr';
type DeskScenePreset = 'walnut' | 'gym' | 'clean';

interface ARDeskPreviewModalProps {
  open: boolean;
  initialMode?: ArPreviewMode;
  theme: 'light' | 'dark';
  finish: StudioFinishKey;
  size: StudioSizeKey;
  engravingText: string;
  engravingFont: 'sans' | 'serif' | 'mono';
  showBoot: boolean;
  exportingGlb: boolean;
  onClose: () => void;
  onSelectFinish: (finish: StudioFinishKey) => void;
  onSelectSize: (size: StudioSizeKey) => void;
  onExportGlb: () => void;
  onAddConfiguredToBag: (config: {
    finish: StudioFinishKey;
    finishName: string;
    finishHex: string;
    isTransparent?: boolean;
    sizeLabel: StudioSizeKey;
    price: number;
    engravingText?: string;
  }) => void;
  onNotify?: (msg: string) => void;
}

export function ARDeskPreviewModal({
  open,
  initialMode = 'desk',
  theme,
  finish,
  size,
  engravingText,
  engravingFont,
  showBoot,
  exportingGlb,
  onClose,
  onSelectFinish,
  onSelectSize,
  onExportGlb,
  onAddConfiguredToBag,
  onNotify,
}: ARDeskPreviewModalProps) {
  const [mode, setMode] = useState<ArPreviewMode>(initialMode);
  const [deskPreset, setDeskPreset] = useState<DeskScenePreset>('walnut');
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isDraggingBottle, setIsDraggingBottle] = useState<boolean>(false);

  // Live Camera / Custom Photo AR state
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  >('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [arScale, setArScale] = useState<number>(1.0);
  const [arPitchDeg, setArPitchDeg] = useState<number>(22);
  const [arRotateDeg, setArRotateDeg] = useState<number>(0);

  // QR handoff state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentFinishSpec =
    STUDIO_FINISHES.find((f) => f.id === finish) || STUDIO_FINISHES[0];
  const currentSizeSpec = SIZE_SPECS[size];
  const computedPrice =
    currentSizeSpec.price + (currentFinishSpec.priceDelta ?? 0);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Build deep-link URL for mobile QR handoff
  const arDeepLink = useMemo(() => {
    if (typeof window === 'undefined') return 'https://waterholic.app/?ar=1';
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = 'studio-3d';
    url.searchParams.set('ar', '1');
    url.searchParams.set('finish', finish);
    url.searchParams.set('size', size);
    if (engravingText.trim()) {
      url.searchParams.set('engraving', engravingText.trim().slice(0, 12));
      url.searchParams.set('font', engravingFont);
    }
    url.searchParams.set('boot', showBoot ? '1' : '0');
    return url.toString();
  }, [finish, size, engravingText, engravingFont, showBoot]);

  // Generate local crisp QR code whenever link changes while open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(arDeepLink, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0A2239',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [open, arDeepLink]);

  // Stop camera cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start live camera pass-through
  const startCameraStream = useCallback(
    async (preferredFacing: 'environment' | 'user') => {
      stopCameraStream();
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraStatus('unavailable');
        return;
      }

      setCameraStatus('requesting');
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: preferredFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available webcam if rear camera is unavailable
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCustomPhotoUrl(null);
        setCameraStatus('active');
      } catch {
        setCameraStatus('denied');
      }
    },
    [stopCameraStream]
  );

  // Manage camera lifecycle based on modal open + active mode
  useEffect(() => {
    if (!open || mode !== 'camera') {
      stopCameraStream();
      if (cameraStatus === 'active' || cameraStatus === 'requesting') {
        setCameraStatus('idle');
      }
      return;
    }
    if (!customPhotoUrl) {
      void startCameraStream(facingMode);
    }
    return () => {
      stopCameraStream();
    };
  }, [open, mode, facingMode, customPhotoUrl, startCameraStream, stopCameraStream]);

  // Clean up object URL for uploaded desk photo
  useEffect(() => {
    return () => {
      if (customPhotoUrl) {
        URL.revokeObjectURL(customPhotoUrl);
      }
    };
  }, [customPhotoUrl]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Mutable state ref for Three.js loop (prevents tearing down WebGL context on UI state changes)
  const arStateRef = useRef({
    mode,
    deskPreset,
    showRuler,
    theme,
    finish,
    size,
    engravingText,
    engravingFont,
    showBoot,
    arScale,
    arPitchDeg,
    arRotateDeg,
  });

  const sceneApiRef = useRef<{
    syncVisuals: () => void;
    resetPlacement: () => void;
    captureWebGlFrame: () => HTMLCanvasElement | null;
  } | null>(null);

  useEffect(() => {
    arStateRef.current = {
      mode,
      deskPreset,
      showRuler,
      theme,
      finish,
      size,
      engravingText,
      engravingFont,
      showBoot,
      arScale,
      arPitchDeg,
      arRotateDeg,
    };
    sceneApiRef.current?.syncVisuals();
  }, [
    mode,
    deskPreset,
    showRuler,
    theme,
    finish,
    size,
    engravingText,
    engravingFont,
    showBoot,
    arScale,
    arPitchDeg,
    arRotateDeg,
  ]);

  // Initialize isolated Three.js WebGL scene for AR / True-Scale Desk Preview
  useEffect(() => {
    if (!open) return;
    const container = canvasHostRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(360, container.clientHeight);

    const probeGl = document.createElement('canvas').getContext('webgl2');
    const isSoftwareGl = (() => {
      if (!probeGl) return true;
      const ext = probeGl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probeGl.RENDERER;
      const gpu = String(probeGl.getParameter(param) || '');
      probeGl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Procedural Studio Environment Map via RoomEnvironment (all devices)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Real-world meter camera (1 unit = 1 meter)
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.04, 15);
    camera.position.set(0.08, 0.34, 0.72);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 0.36;
    controls.maxDistance = 1.45;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 0.13, 0);

    // Balanced 3-point architectural lighting
    const hemiLight = new THREE.HemisphereLight(0xeef7ff, 0x3b3026, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.2);
    keyLight.position.set(0.85, 1.45, 0.95);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.2;
      keyLight.shadow.camera.far = 4.0;
      keyLight.shadow.camera.left = -0.65;
      keyLight.shadow.camera.right = 0.65;
      keyLight.shadow.camera.top = 0.65;
      keyLight.shadow.camera.bottom = -0.65;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.015;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.95);
    rimLight.position.set(-0.9, 0.8, -0.7);
    scene.add(rimLight);

    // --- Desk / Gym Surface Plane (grounded at y = 0) ---
    const walnutTex = createWalnutDeskTexture(maxAniso);
    const gymTex = createGymBenchTexture(maxAniso);

    const deskGeo = new THREE.PlaneGeometry(2.6, 2.2);
    const walnutMat = new THREE.MeshStandardMaterial({
      map: walnutTex,
      roughness: 0.62,
      metalness: 0.04,
    });
    const gymMat = new THREE.MeshStandardMaterial({
      map: gymTex,
      roughness: 0.88,
      metalness: 0.06,
    });
    const cleanMat = new THREE.MeshStandardMaterial({
      color: 0xe6eff6,
      roughness: 0.78,
      metalness: 0.04,
    });

    const surfaceMesh = new THREE.Mesh(deskGeo, walnutMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.y = -0.001;
    surfaceMesh.receiveShadow = !isSoftwareGl;
    scene.add(surfaceMesh);

    // Subtle measurement grid overlay for Clean / Scale mode (offset +0.0008m to avoid Z-fighting)
    const scaleGrid = new THREE.GridHelper(1.2, 24, 0x0284c7, 0x94a3b8);
    scaleGrid.position.y = 0.0008;
    const gridMaterials = Array.isArray(scaleGrid.material)
      ? scaleGrid.material
      : [scaleGrid.material];
    gridMaterials.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.24;
    });
    scene.add(scaleGrid);

    // --- True-Scale Reference Props ---
    const deskProps = createDeskReferenceProps(isSoftwareGl);
    scene.add(deskProps.group);

    const gymProps = createGymReferenceProps(isSoftwareGl);
    gymProps.group.visible = false;
    scene.add(gymProps.group);

    // --- Bottle Placement Anchor Group (draggable across y = 0) ---
    const placementAnchor = new THREE.Group();
    placementAnchor.position.set(0.02, 0, 0.03);
    scene.add(placementAnchor);

    const initS = arStateRef.current;
    const bottleHandle = createProceduralArBottle({
      finish: initS.finish,
      size: initS.size,
      engravingText: initS.engravingText,
      engravingFont: initS.engravingFont,
      showBoot: initS.showBoot,
      isSoftwareGl,
      maxAnisotropy: maxAniso,
    });
    placementAnchor.add(bottleHandle.group);

    // Soft grounded contact shadow beneath the bottle
    const shadowTex = createContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(0.19, 0.19);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.0012;
    placementAnchor.add(contactShadow);

    // Architectural Placement Reticle Ring + Standard 7.6 cm Car Cup-Holder Gauge Ring
    const reticleGeo = new THREE.RingGeometry(0.056, 0.062, 64);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.rotation.x = -Math.PI / 2;
    reticleMesh.position.y = 0.0022;
    placementAnchor.add(reticleMesh);

    // True-scale 3D vertical height caliper beside bottle
    const rulerGroup = new THREE.Group();
    const rulerMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.78,
    });
    const rulerPositions = new Float32Array(18); // 3 line segments: vertical stem + top tick + bottom tick
    const rulerGeo = new THREE.BufferGeometry();
    rulerGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(rulerPositions, 3)
    );
    const rulerLines = new THREE.LineSegments(rulerGeo, rulerMat);
    rulerGroup.add(rulerLines);
    placementAnchor.add(rulerGroup);

    // Invisible simplified cylinder hit proxy for crisp bottle dragging
    const dragProxyGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.34, 16);
    const dragProxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const dragProxy = new THREE.Mesh(dragProxyGeo, dragProxyMat);
    dragProxy.position.y = 0.17;
    placementAnchor.add(dragProxy);

    const updateRulerGeometry = (sizeKey: StudioSizeKey) => {
      const sz = SIZE_SPECS[sizeKey];
      const h = sz.heightCm / 100;
      const r = sz.diameterCm / 200;
      const x = r + 0.032;
      const posAttr = rulerGeo.getAttribute('position') as THREE.BufferAttribute;
      // Vertical stem
      posAttr.setXYZ(0, x, 0.002, 0);
      posAttr.setXYZ(1, x, h, 0);
      // Bottom caliper tick
      posAttr.setXYZ(2, x - 0.012, 0.002, 0);
      posAttr.setXYZ(3, x + 0.012, 0.002, 0);
      // Top caliper tick
      posAttr.setXYZ(4, x - 0.012, h, 0);
      posAttr.setXYZ(5, x + 0.012, h, 0);
      posAttr.needsUpdate = true;
    };

    const lightBgColor = new THREE.Color('#E8F2F9');
    const darkBgColor = new THREE.Color('#0B1222');
    const gymBgColor = new THREE.Color('#131922');

    // Sync scene visuals whenever React controls change
    const syncVisuals = () => {
      const s = arStateRef.current;
      bottleHandle.updateConfig({
        finish: s.finish,
        size: s.size,
        engravingText: s.engravingText,
        engravingFont: s.engravingFont,
        showBoot: s.showBoot,
      });
      updateRulerGeometry(s.size);

      const isCameraOverlay = s.mode === 'camera';
      surfaceMesh.visible = !isCameraOverlay;
      deskProps.group.visible = !isCameraOverlay && s.deskPreset === 'walnut';
      gymProps.group.visible = !isCameraOverlay && s.deskPreset === 'gym';
      scaleGrid.visible = !isCameraOverlay && s.deskPreset === 'clean';
      rulerGroup.visible = s.showRuler;

      if (isCameraOverlay) {
        scene.background = null;
        scene.fog = null;
        controls.enabled = false;
        // Position perspective camera from AR pitch & distance so user's desk tilt matches naturally
        const pitchRad = THREE.MathUtils.degToRad(s.arPitchDeg);
        const dist = 0.72;
        camera.position.set(
          0,
          0.11 + Math.sin(pitchRad) * dist,
          Math.cos(pitchRad) * dist
        );
        camera.lookAt(0, 0.12, 0);
        placementAnchor.scale.setScalar(s.arScale);
        bottleHandle.group.rotation.y = THREE.MathUtils.degToRad(s.arRotateDeg);
        contactShadowMat.opacity = 0.72;
        reticleMat.opacity = 0.62;
      } else {
        const bg =
          s.deskPreset === 'gym'
            ? gymBgColor
            : s.theme === 'dark'
              ? darkBgColor
              : lightBgColor;
        scene.background = bg;
        scene.fog = new THREE.FogExp2(bg.getHex(), 0.42);
        cleanMat.color.setHex(s.theme === 'dark' ? 0x162233 : 0xe4eef6);
        surfaceMesh.material =
          s.deskPreset === 'walnut'
            ? walnutMat
            : s.deskPreset === 'gym'
              ? gymMat
              : cleanMat;
        controls.enabled = true;
        placementAnchor.scale.setScalar(1);
        contactShadowMat.opacity = 0.56;
        reticleMat.opacity = s.showRuler ? 0.45 : 0.0;
      }
    };

    syncVisuals();

    // --- Interactive Surface Placement (Ray-plane intersection on y = 0) ---
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    const targetPlacement = new THREE.Vector3(
      placementAnchor.position.x,
      0,
      placementAnchor.position.z
    );

    let dragging = false;
    let activePointerId: number | null = null;

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      const s = arStateRef.current;
      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);

      if (s.mode === 'camera') {
        // Tap or drag anywhere in Live Camera / Photo mode to place bottle on surface
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          dragging = true;
          activePointerId = e.pointerId;
          setIsDraggingBottle(true);
          renderer.domElement.setPointerCapture?.(e.pointerId);
          targetPlacement.set(
            THREE.MathUtils.clamp(hitPoint.x, -0.42, 0.42),
            0,
            THREE.MathUtils.clamp(hitPoint.z, -0.35, 0.35)
          );
          triggerMicroHapticTick();
        }
        return;
      }

      // In Desk Scale mode: grab bottle to slide it across the desk, or drag outside bottle to orbit camera
      const hits = raycaster.intersectObject(dragProxy, false);
      if (hits.length > 0 && raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        dragging = true;
        activePointerId = e.pointerId;
        controls.enabled = false;
        setIsDraggingBottle(true);
        renderer.domElement.setPointerCapture?.(e.pointerId);
        dragOffset.subVectors(placementAnchor.position, hitPoint);
        dragOffset.y = 0;
        triggerMicroHapticTick();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = arStateRef.current;
      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);

      if (!dragging) {
        if (s.mode === 'desk' && e.pointerType !== 'touch') {
          const hovered = raycaster.intersectObject(dragProxy, false).length > 0;
          renderer.domElement.style.cursor = hovered ? 'grab' : 'default';
        } else if (s.mode === 'camera') {
          renderer.domElement.style.cursor = 'crosshair';
        }
        return;
      }

      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        if (s.mode === 'camera') {
          targetPlacement.set(
            THREE.MathUtils.clamp(hitPoint.x, -0.45, 0.45),
            0,
            THREE.MathUtils.clamp(hitPoint.z, -0.38, 0.38)
          );
        } else {
          targetPlacement.set(
            THREE.MathUtils.clamp(hitPoint.x + dragOffset.x, -0.42, 0.42),
            0,
            THREE.MathUtils.clamp(hitPoint.z + dragOffset.z, -0.34, 0.34)
          );
        }
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (activePointerId !== null) {
        try {
          renderer.domElement.releasePointerCapture?.(activePointerId);
        } catch {
          // Ignore if already released
        }
        activePointerId = null;
      }
      setIsDraggingBottle(false);
      if (arStateRef.current.mode === 'desk') {
        controls.enabled = true;
      }
      renderer.domElement.style.cursor =
        arStateRef.current.mode === 'camera' ? 'crosshair' : 'default';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', endDrag);
    renderer.domElement.addEventListener('pointercancel', endDrag);

    sceneApiRef.current = {
      syncVisuals,
      resetPlacement: () => {
        targetPlacement.set(0.02, 0, 0.03);
        if (arStateRef.current.mode === 'desk') {
          camera.position.set(0.08, 0.34, 0.72);
          controls.target.set(0, 0.13, 0);
        }
      },
      captureWebGlFrame: () => {
        renderer.render(scene, camera);
        return renderer.domElement;
      },
    };

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(360, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const glCtx = renderer.getContext() as WebGL2RenderingContext;
      const sync = glCtx.fenceSync?.(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
      glCtx.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS);
        if (st === glCtx.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) glCtx.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Smooth exponential damping for drag placement
      const dampFactor = 1 - Math.exp(-14 * dt);
      placementAnchor.position.x = THREE.MathUtils.lerp(
        placementAnchor.position.x,
        targetPlacement.x,
        dampFactor
      );
      placementAnchor.position.z = THREE.MathUtils.lerp(
        placementAnchor.position.z,
        targetPlacement.z,
        dampFactor
      );

      // Gentle reticle feedback while dragging
      const targetReticleScale = dragging ? 1.16 : 1.0;
      reticleMesh.scale.x = THREE.MathUtils.lerp(
        reticleMesh.scale.x,
        targetReticleScale,
        dampFactor
      );
      reticleMesh.scale.y = reticleMesh.scale.x;

      // Subtle glass water surface motion
      bottleHandle.updateWaterBob(elapsed);

      if (arStateRef.current.mode === 'desk') {
        controls.update();
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', endDrag);
      renderer.domElement.removeEventListener('pointercancel', endDrag);
      controls.dispose();
      sceneApiRef.current = null;
      bottleHandle.dispose();
      deskProps.dispose();
      gymProps.dispose();
      envTarget.dispose();
      walnutTex.dispose();
      gymTex.dispose();
      shadowTex.dispose();
      deskGeo.dispose();
      walnutMat.dispose();
      gymMat.dispose();
      cleanMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      rulerGeo.dispose();
      rulerMat.dispose();
      dragProxyGeo.dispose();
      dragProxyMat.dispose();
      renderer.dispose();
    };
  }, [open]);

  // Handle uploading user's own desk / room photo for AR placement
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    if (customPhotoUrl) {
      URL.revokeObjectURL(customPhotoUrl);
    }
    const objUrl = URL.createObjectURL(file);
    setCustomPhotoUrl(objUrl);
    setCameraStatus('idle');
    setMode('camera');
    onNotify?.('Desk photo loaded — drag your bottle to position it');
    e.target.value = '';
  };

  // Composite live camera / desk photo + transparent WebGL 3D bottle into downloadable PNG
  const handleCaptureArPhoto = () => {
    const glCanvas = sceneApiRef.current?.captureWebGlFrame();
    if (!glCanvas) return;

    const out = document.createElement('canvas');
    out.width = glCanvas.width;
    out.height = glCanvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const drawCover = (
      source: HTMLVideoElement | HTMLImageElement,
      srcW: number,
      srcH: number
    ) => {
      if (srcW <= 0 || srcH <= 0) return;
      const canvasAspect = out.width / out.height;
      const srcAspect = srcW / srcH;
      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;
      if (srcAspect > canvasAspect) {
        sw = srcH * canvasAspect;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / canvasAspect;
        sy = (srcH - sh) / 2;
      }
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
    };

    if (mode === 'camera') {
      if (customPhotoUrl && photoImgRef.current && photoImgRef.current.complete) {
        drawCover(
          photoImgRef.current,
          photoImgRef.current.naturalWidth,
          photoImgRef.current.naturalHeight
        );
      } else if (
        videoRef.current &&
        cameraStatus === 'active' &&
        videoRef.current.videoWidth > 0
      ) {
        drawCover(
          videoRef.current,
          videoRef.current.videoWidth,
          videoRef.current.videoHeight
        );
      } else {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, out.width, out.height);
      }
    }

    ctx.drawImage(glCanvas, 0, 0);

    // Crisp architectural spec watermark in bottom-left corner
    const pad = Math.round(out.width * 0.025);
    const fontSize = Math.max(14, Math.round(out.width * 0.014));
    ctx.save();
    ctx.fillStyle = 'rgba(10, 24, 38, 0.78)';
    const label = `WATERHOLIC AR · ${currentFinishSpec.label.toUpperCase()} · ${currentSizeSpec.label} (${currentSizeSpec.heightCm} CM)`;
    ctx.font = `600 ${fontSize}px "DM Mono", monospace`;
    const textW = ctx.measureText(label).width;
    ctx.beginPath();
    ctx.roundRect(pad, out.height - pad - fontSize * 2.1, textW + pad * 1.4, fontSize * 2.1, 8);
    ctx.fill();
    ctx.fillStyle = '#F0F9FF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad + pad * 0.7, out.height - pad - fontSize * 1.05);
    ctx.restore();

    const link = document.createElement('a');
    link.href = out.toDataURL('image/png');
    link.download = `waterholic-ar-desk-${finish}-${size.replace(/\s+/g, '')}.png`;
    link.click();
    triggerMicroHapticTick();
    onNotify?.('Saved AR Desk Preview snapshot as PNG');
  };

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(arDeepLink);
      setCopiedLink(true);
      triggerMicroHapticTick();
      onNotify?.('Copied AR deep-link to clipboard');
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onNotify?.('Could not access clipboard');
    }
  };

  if (!open) return null;

  const heightInches = (currentSizeSpec.heightCm / 2.54).toFixed(1);
  const diameterInches = (currentSizeSpec.diameterCm / 2.54).toFixed(1);

  return (
    <div
      className="ar-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="AR View on Your Desk Preview"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ar-modal-shell">
        {/* Top Bar */}
        <header className="ar-modal-header">
          <div className="ar-modal-brand">
            <span className="ar-modal-kicker">1:1 True-Scale AR Preview</span>
            <h3 className="ar-modal-title">
              View on Your Desk · {currentFinishSpec.label} ({size})
            </h3>
          </div>

          <div
            className="ar-mode-tabs"
            role="tablist"
            aria-label="AR Preview Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'desk'}
              className={`ar-mode-tab${mode === 'desk' ? ' is-active' : ''}`}
              onClick={() => setMode('desk')}
            >
              <Ruler size={14} aria-hidden="true" />
              <span>Desk Scale</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'camera'}
              className={`ar-mode-tab${mode === 'camera' ? ' is-active' : ''}`}
              onClick={() => setMode('camera')}
            >
              <Video size={14} aria-hidden="true" />
              <span>Live Camera AR</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'qr'}
              className={`ar-mode-tab${mode === 'qr' ? ' is-active' : ''}`}
              onClick={() => setMode('qr')}
            >
              <QrCode size={14} aria-hidden="true" />
              <span>Send to Phone</span>
            </button>
          </div>

          <div className="ar-modal-header-actions">
            <button
              type="button"
              className="btn btn-primary ar-add-btn"
              onClick={(e) => {
                triggerAddToBagHaptic(e.currentTarget);
                onAddConfiguredToBag({
                  finish,
                  finishName: currentFinishSpec.label,
                  finishHex: currentFinishSpec.hex,
                  isTransparent: currentFinishSpec.isGlass,
                  sizeLabel: size,
                  price: computedPrice,
                  engravingText: engravingText.trim() || undefined,
                });
              }}
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>Add — ${computedPrice}</span>
            </button>
            <button
              type="button"
              className="ar-close-btn"
              onClick={onClose}
              aria-label="Close AR preview"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Hidden input for uploading a custom desk photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoUpload}
        />

        {/* Main Viewport Stage */}
        <div className="ar-stage-wrap">
          {/* Background media layers for Live Camera / Uploaded Desk Photo */}
          {mode === 'camera' && !customPhotoUrl && (
            <video
              ref={videoRef}
              className="ar-camera-video"
              playsInline
              muted
              autoPlay
            />
          )}

          {mode === 'camera' && customPhotoUrl && (
            <img
              ref={photoImgRef}
              src={customPhotoUrl}
              alt="Your uploaded desk surface"
              className="ar-camera-photo"
            />
          )}

          {/* Isolated Three.js WebGL Layer (kept mounted while open to avoid context churn) */}
          <div
            ref={canvasHostRef}
            className={`ar-webgl-host${mode === 'qr' ? ' is-hidden' : ''}`}
            aria-label="Interactive 3D AR bottle placement viewport"
          />

          {/* Camera permission / fallback banner inside Live Camera mode */}
          {mode === 'camera' &&
            !customPhotoUrl &&
            (cameraStatus === 'denied' || cameraStatus === 'unavailable') && (
              <div className="ar-camera-fallback">
                <VideoOff size={22} aria-hidden="true" />
                <div>
                  <strong>
                    {cameraStatus === 'unavailable'
                      ? 'Camera not detected on this device'
                      : 'Camera permission was blocked'}
                  </strong>
                  <p>
                    Upload a photo of your real desk or nightstand to test true
                    scale right now, or scan the QR code on your phone.
                  </p>
                </div>
                <div className="ar-camera-fallback-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={15} aria-hidden="true" />
                    Upload Desk Photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setMode('qr')}
                  >
                    <Smartphone size={15} aria-hidden="true" />
                    Open on Phone
                  </button>
                </div>
              </div>
            )}

          {mode === 'camera' && !customPhotoUrl && cameraStatus === 'requesting' && (
            <div className="ar-camera-loading">
              <Loader2 size={18} className="studio3d-spin" aria-hidden="true" />
              <span>Starting camera pass-through…</span>
            </div>
          )}

          {/* Top-left static true-scale spec readout (zero backdrop-filter over WebGL) */}
          {mode !== 'qr' && (
            <div className="ar-spec-hud">
              <div className="ar-spec-pill">
                <span className="ar-spec-label">Height</span>
                <strong className="tabular-nums">
                  {currentSizeSpec.heightCm} cm ({heightInches}&Prime;)
                </strong>
              </div>
              <div className="ar-spec-pill">
                <span className="ar-spec-label">Base Ø</span>
                <strong className="tabular-nums">
                  {currentSizeSpec.diameterCm} cm ({diameterInches}&Prime;)
                </strong>
              </div>
              <div
                className={`ar-spec-pill ar-spec-fit${
                  currentSizeSpec.fitsCupHolder ? ' is-yes' : ''
                }`}
              >
                <span>{currentSizeSpec.cupHolderNote}</span>
              </div>
            </div>
          )}

          {/* Top-right compact utility actions (Snap photo / Upload photo / Reset) */}
          {mode !== 'qr' && (
            <div className="ar-stage-actions">
              <span className="ar-drag-hint">
                <Move size={13} aria-hidden="true" />
                <span>
                  {isDraggingBottle
                    ? 'Sliding on surface…'
                    : mode === 'camera'
                      ? 'Tap or drag bottle to place'
                      : 'Drag bottle on desk · orbit around'}
                </span>
              </span>
              {mode === 'camera' && (
                <button
                  type="button"
                  className="ar-hud-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Use a photo of your own desk"
                >
                  <ImagePlus size={14} aria-hidden="true" />
                  <span>{customPhotoUrl ? 'Change Photo' : 'Use Photo'}</span>
                </button>
              )}
              {mode === 'camera' && !customPhotoUrl && cameraStatus === 'active' && (
                <button
                  type="button"
                  className="ar-hud-btn"
                  onClick={() =>
                    setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))
                  }
                  title="Flip camera"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  <span>Flip Cam</span>
                </button>
              )}
              {mode === 'camera' && customPhotoUrl && (
                <button
                  type="button"
                  className="ar-hud-btn"
                  onClick={() => {
                    setCustomPhotoUrl(null);
                    void startCameraStream(facingMode);
                  }}
                >
                  <Video size={14} aria-hidden="true" />
                  <span>Live Cam</span>
                </button>
              )}
              <button
                type="button"
                className="ar-hud-btn"
                onClick={handleCaptureArPhoto}
                title="Save AR preview snapshot"
              >
                <Camera size={14} aria-hidden="true" />
                <span>Snap AR</span>
              </button>
              <button
                type="button"
                className="ar-hud-btn"
                onClick={() => {
                  setArScale(1.0);
                  setArPitchDeg(22);
                  setArRotateDeg(0);
                  sceneApiRef.current?.resetPlacement();
                }}
                title="Center bottle on surface"
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Center</span>
              </button>
            </div>
          )}

          {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion, solid surface) */}
          {mode !== 'qr' && (
            <div className={`ar-dock${dockCollapsed ? ' is-collapsed' : ''}`}>
              <button
                type="button"
                className="ar-dock-toggle"
                onClick={() => setDockCollapsed((c) => !c)}
                aria-expanded={!dockCollapsed}
              >
                <Sparkles size={13} aria-hidden="true" />
                <span>
                  {dockCollapsed ? 'Show AR Controls' : 'Hide AR Controls'}
                </span>
                {dockCollapsed ? (
                  <ChevronUp size={14} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} aria-hidden="true" />
                )}
              </button>

              {!dockCollapsed && (
                <div className="ar-dock-body">
                  {/* Size comparison switcher */}
                  <div className="ar-dock-group">
                    <span className="ar-dock-label">Compare Size</span>
                    <div className="ar-seg-row">
                      {(['750 ml', '950 ml', '1.2 L'] as StudioSizeKey[]).map(
                        (sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`ar-seg-btn${size === sz ? ' is-active' : ''}`}
                            onClick={() => {
                              onSelectSize(sz);
                              triggerMicroHapticTick();
                            }}
                          >
                            {sz}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Finish swatches */}
                  <div className="ar-dock-group">
                    <span className="ar-dock-label">Finish</span>
                    <div className="ar-swatch-row">
                      {STUDIO_FINISHES.map((fin) => (
                        <button
                          key={fin.id}
                          type="button"
                          className={`studio3d-swatch${
                            finish === fin.id ? ' is-active' : ''
                          }`}
                          onClick={() => {
                            onSelectFinish(fin.id);
                            triggerMicroHapticTick();
                          }}
                          title={fin.label}
                          aria-label={`Select ${fin.label} finish`}
                        >
                          <span
                            className={`studio3d-swatch-dot${
                              fin.isGlass ? ' swatch-transparent' : ''
                            }`}
                            style={
                              fin.isGlass ? undefined : { background: fin.hex }
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Desk-mode surface presets OR Live Camera calibration sliders */}
                  {mode === 'desk' ? (
                    <>
                      <div className="ar-dock-group">
                        <span className="ar-dock-label">Reference Scene</span>
                        <div className="ar-seg-row">
                          {(
                            [
                              { id: 'walnut', label: 'Walnut Desk' },
                              { id: 'gym', label: 'Gym Bench' },
                              { id: 'clean', label: 'Scale Grid' },
                            ] as { id: DeskScenePreset; label: string }[]
                          ).map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              className={`ar-seg-btn${
                                deskPreset === preset.id ? ' is-active' : ''
                              }`}
                              onClick={() => setDeskPreset(preset.id)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="ar-dock-group">
                        <span className="ar-dock-label">Caliper</span>
                        <button
                          type="button"
                          className={`ar-seg-btn${showRuler ? ' is-active' : ''}`}
                          onClick={() => setShowRuler((r) => !r)}
                        >
                          <Ruler size={13} aria-hidden="true" />
                          <span>{showRuler ? 'Ruler On' : 'Ruler Off'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ar-dock-group ar-slider-group">
                        <label htmlFor="ar-scale-range" className="ar-dock-label">
                          Scale ({Math.round(arScale * 100)}%)
                        </label>
                        <input
                          id="ar-scale-range"
                          type="range"
                          min={0.55}
                          max={1.55}
                          step={0.02}
                          value={arScale}
                          onChange={(e) => setArScale(Number(e.target.value))}
                          className="studio3d-range"
                        />
                      </div>

                      <div className="ar-dock-group ar-slider-group">
                        <label htmlFor="ar-pitch-range" className="ar-dock-label">
                          Desk Tilt ({arPitchDeg}°)
                        </label>
                        <input
                          id="ar-pitch-range"
                          type="range"
                          min={8}
                          max={48}
                          step={1}
                          value={arPitchDeg}
                          onChange={(e) => setArPitchDeg(Number(e.target.value))}
                          className="studio3d-range"
                        />
                      </div>

                      <div className="ar-dock-group ar-slider-group">
                        <label htmlFor="ar-rotate-range" className="ar-dock-label">
                          Turn ({arRotateDeg}°)
                        </label>
                        <input
                          id="ar-rotate-range"
                          type="range"
                          min={0}
                          max={360}
                          step={2}
                          value={arRotateDeg}
                          onChange={(e) => setArRotateDeg(Number(e.target.value))}
                          className="studio3d-range"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode C: Mobile QR Handoff & Native AR GLB Sheet */}
          {mode === 'qr' && (
            <div className="ar-qr-panel">
              <div className="ar-qr-card">
                <div className="ar-qr-code-box">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR code to open this exact custom Waterholic bottle in AR on your phone"
                      className="ar-qr-img"
                    />
                  ) : (
                    <div className="ar-qr-placeholder">
                      <Loader2 size={24} className="studio3d-spin" />
                    </div>
                  )}
                </div>

                <div className="ar-qr-info">
                  <span className="ar-modal-kicker">Instant Mobile Handoff</span>
                  <h4>Scan to Place This Exact Build on Your Desk</h4>
                  <p>
                    Point your iPhone or Android camera at the code to launch
                    Live Camera AR with your selected finish, capacity, boot, and
                    laser monogram preloaded.
                  </p>

                  <div className="ar-qr-specs-grid">
                    <div className="ar-qr-spec-item">
                      <span>Finish</span>
                      <strong>{currentFinishSpec.label}</strong>
                    </div>
                    <div className="ar-qr-spec-item">
                      <span>Capacity</span>
                      <strong className="tabular-nums">
                        {size} ({currentSizeSpec.heightCm} cm)
                      </strong>
                    </div>
                    <div className="ar-qr-spec-item">
                      <span>Engraving</span>
                      <strong>{engravingText.trim() || 'None'}</strong>
                    </div>
                    <div className="ar-qr-spec-item">
                      <span>Silicone Boot</span>
                      <strong>{showBoot ? 'Installed' : 'Removed'}</strong>
                    </div>
                  </div>

                  <div className="ar-qr-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCopyDeepLink}
                    >
                      {copiedLink ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        <Copy size={15} aria-hidden="true" />
                      )}
                      <span>{copiedLink ? 'AR Link Copied' : 'Copy Mobile AR Link'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={onExportGlb}
                      disabled={exportingGlb}
                    >
                      {exportingGlb ? (
                        <Loader2 size={15} className="studio3d-spin" aria-hidden="true" />
                      ) : (
                        <Download size={15} aria-hidden="true" />
                      )}
                      <span>
                        {exportingGlb
                          ? 'Preparing GLB…'
                          : 'Download AR Model (.GLB)'}
                      </span>
                    </button>
                  </div>

                  <p className="ar-qr-footnote">
                    <Box size={13} aria-hidden="true" />
                    <span>
                      Exported .GLB uses true meter coordinates (1:1 physical
                      scale) for Android Scene Viewer, iOS AR viewers, and 3D apps.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
