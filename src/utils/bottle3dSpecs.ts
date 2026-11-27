import * as THREE from 'three';

export type StudioFinishKey =
  | 'blue'
  | 'pink'
  | 'transparent'
  | 'sage'
  | 'basalt'
  | 'glacier';

export type StudioSizeKey = '750 ml' | '950 ml' | '1.2 L';

export interface StudioFinishSpec {
  id: StudioFinishKey;
  label: string;
  hex: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  isGlass?: boolean;
  priceDelta?: number;
  bootHex: string;
  logoInk: string;
}

export interface StudioSizeSpec {
  scaleY: number;
  scaleXZ: number;
  price: number;
  label: string;
  heightCm: number;
  diameterCm: number;
  weightGrams: number;
  cupHolderNote: string;
  fitsCupHolder: boolean;
}

export const STUDIO_FINISHES: StudioFinishSpec[] = [
  {
    id: 'blue',
    label: 'Ocean Blue',
    hex: '#0284C7',
    roughness: 0.42,
    metalness: 0.25,
    clearcoat: 0.25,
    bootHex: '#0A2239',
    logoInk: '#F0F9FF',
  },
  {
    id: 'pink',
    label: 'Rose Pink',
    hex: '#E495A6',
    roughness: 0.36,
    metalness: 0.3,
    clearcoat: 0.45,
    priceDelta: 6,
    bootHex: '#8E495A',
    logoInk: '#FFF5F7',
  },
  {
    id: 'transparent',
    label: 'Transparent',
    hex: '#E8F6FF',
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 1.0,
    isGlass: true,
    bootHex: '#7FA9C2',
    logoInk: '#0A2239',
  },
  {
    id: 'sage',
    label: 'Alpine Sage',
    hex: '#48634B',
    roughness: 0.48,
    metalness: 0.18,
    clearcoat: 0.18,
    bootHex: '#1F2E21',
    logoInk: '#EFF6F0',
  },
  {
    id: 'basalt',
    label: 'Basalt Black',
    hex: '#222624',
    roughness: 0.52,
    metalness: 0.28,
    clearcoat: 0.2,
    bootHex: '#101312',
    logoInk: '#D7E8F5',
  },
  {
    id: 'glacier',
    label: 'Glacier Silver',
    hex: '#B4BDB8',
    roughness: 0.24,
    metalness: 0.82,
    clearcoat: 0.35,
    bootHex: '#4A5550',
    logoInk: '#12222E',
  },
];

export const SIZE_SPECS: Record<StudioSizeKey, StudioSizeSpec> = {
  '750 ml': {
    scaleY: 0.9,
    scaleXZ: 0.95,
    price: 10,
    label: '750 ML',
    heightCm: 24.8,
    diameterCm: 8.6,
    weightGrams: 375,
    cupHolderNote: 'Fits standard car & desk cup holders',
    fitsCupHolder: true,
  },
  '950 ml': {
    scaleY: 1.0,
    scaleXZ: 1.0,
    price: 12,
    label: '950 ML',
    heightCm: 27.6,
    diameterCm: 9.0,
    weightGrams: 430,
    cupHolderNote: 'Fits oversized console & backpack sleeves',
    fitsCupHolder: true,
  },
  '1.2 L': {
    scaleY: 1.12,
    scaleXZ: 1.05,
    price: 14,
    label: '1.2 L',
    heightCm: 30.9,
    diameterCm: 9.5,
    weightGrams: 510,
    cupHolderNote: 'Wide expedition base · built for desks & trails',
    fitsCupHolder: false,
  },
};

export function createBrandWrapTexture(
  baseHex: string,
  inkHex: string,
  sizeLabel: string,
  isGlass: boolean,
  resolution = 1024,
  engraving?: { text: string; font: 'sans' | 'serif' | 'mono' },
  maxAnisotropy = 8
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;
  const scale = resolution / 1024;
  ctx.scale(scale, scale);

  if (isGlass) {
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = 'rgba(232, 246, 255, 0.14)';
    ctx.fillRect(0, 0, 1024, 1024);
  } else {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 1024, 1024);

    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.09)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 4200; i++) {
      const x = (i * 1973) % 1024;
      const y = (i * 3571) % 1024;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.028)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const cx = 512;
  const cy = 480;

  ctx.save();
  ctx.strokeStyle = inkHex;
  ctx.fillStyle = inkHex;
  ctx.globalAlpha = isGlass ? 0.78 : 0.88;

  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 115);
  ctx.bezierCurveTo(cx - 46, cy - 52, cx - 50, cy - 16, cx, cy - 16);
  ctx.bezierCurveTo(cx + 50, cy - 16, cx + 46, cy - 52, cx, cy - 115);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 50, 20, Math.PI * 0.62, Math.PI * 0.96);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '600 44px "Plus Jakarta Sans", "IBM Plex Sans", -apple-system, sans-serif';
  ctx.fillText('W A T E R H O L I C', cx, cy + 56);

  ctx.globalAlpha = isGlass ? 0.55 : 0.62;
  ctx.fillRect(cx - 58, cy + 82, 116, 2.5);

  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText(`18/8 VACUUM  ·  ${sizeLabel}`, cx, cy + 122);

  const cleanedEngraving = engraving?.text.trim().slice(0, 12) ?? '';
  if (cleanedEngraving) {
    ctx.globalAlpha = isGlass ? 0.72 : 0.82;
    const fontFamily =
      engraving?.font === 'serif'
        ? '600 32px Georgia, "Times New Roman", serif'
        : engraving?.font === 'mono'
          ? '500 26px "IBM Plex Mono", monospace'
          : '600 28px "Plus Jakarta Sans", "IBM Plex Sans", -apple-system, sans-serif';
    ctx.font = fontFamily;
    ctx.fillText(
      cleanedEngraving.toUpperCase().split('').join(' '),
      cx,
      cy + 188
    );
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 122);
  grad.addColorStop(0, 'rgba(6, 16, 28, 0.52)');
  grad.addColorStop(0.5, 'rgba(6, 16, 28, 0.22)');
  grad.addColorStop(1, 'rgba(6, 16, 28, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural walnut wood grain desk texture (zero external image files).
 */
export function createWalnutDeskTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  baseGrad.addColorStop(0, '#8C6244');
  baseGrad.addColorStop(0.5, '#7A5338');
  baseGrad.addColorStop(1, '#6C472F');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle horizontal plank bands and organic wood grain streaks
  for (let i = 0; i < 240; i++) {
    const y = (i / 240) * 1024;
    const thickness = 1.5 + (i % 5) * 1.1;
    const isDark = i % 3 === 0;
    ctx.strokeStyle = isDark
      ? 'rgba(42, 23, 12, 0.16)'
      : 'rgba(182, 136, 98, 0.12)';
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) {
      const wave =
        Math.sin(x * 0.008 + i * 0.37) * 5 +
        Math.cos(x * 0.02 + i * 0.19) * 2.2;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // Subtle architectural plank seams
  ctx.strokeStyle = 'rgba(34, 18, 8, 0.28)';
  ctx.lineWidth = 2;
  [256, 512, 768].forEach((seamY) => {
    ctx.beginPath();
    ctx.moveTo(0, seamY);
    ctx.lineTo(1024, seamY);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural charcoal rubberized gym bench texture.
 */
export function createGymBenchTexture(maxAnisotropy = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1E242B';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = (i * 1973) % 512;
    const y = (i * 3571) % 512;
    const shade = i % 4 === 0 ? 'rgba(148, 163, 184, 0.09)' : 'rgba(9, 13, 18, 0.25)';
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 2.2, 2.2);
  }

  // Subtle stitched upholstery seam line
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralArBottleHandle {
  group: THREE.Group;
  updateConfig: (opts: {
    finish: StudioFinishKey;
    size: StudioSizeKey;
    engravingText: string;
    engravingFont: 'sans' | 'serif' | 'mono';
    showBoot: boolean;
  }) => void;
  updateWaterBob: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * Builds the composite 10-part Waterholic procedural bottle scaled to exact real-world meters
 * (1 scene unit = 1 meter, bottom-center pivot grounded at y = 0).
 */
export function createProceduralArBottle(opts: {
  finish: StudioFinishKey;
  size: StudioSizeKey;
  engravingText: string;
  engravingFont: 'sans' | 'serif' | 'mono';
  showBoot: boolean;
  isSoftwareGl: boolean;
  maxAnisotropy: number;
}): ProceduralArBottleHandle {
  // Real-world meter scale factor: 3.68 scene units * 0.075 = 0.276 m (27.6 cm for 950ml)
  const AR_METER_SCALE = 0.075;

  const group = new THREE.Group();
  const innerGroup = new THREE.Group();
  group.add(innerGroup);

  // 1. Protective Silicone Base Boot
  const bootPts = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.625, 0.06),
    new THREE.Vector2(0.635, 0.44),
    new THREE.Vector2(0.618, 0.48),
    new THREE.Vector2(0.585, 0.46),
    new THREE.Vector2(0.585, 0.05),
    new THREE.Vector2(0.01, 0.05),
  ];
  const bootGeo = new THREE.LatheGeometry(bootPts, 52);
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x0a2239,
    roughness: 0.86,
    metalness: 0.04,
  });
  const bootMesh = new THREE.Mesh(bootGeo, bootMat);
  bootMesh.castShadow = !opts.isSoftwareGl;
  bootMesh.receiveShadow = !opts.isSoftwareGl;
  innerGroup.add(bootMesh);

  // 2. Outer Double-Wall Body
  const bodyPts = [
    new THREE.Vector2(0.01, 0.02),
    new THREE.Vector2(0.54, 0.02),
    new THREE.Vector2(0.6, 0.09),
    new THREE.Vector2(0.605, 1.98),
    new THREE.Vector2(0.585, 2.14),
    new THREE.Vector2(0.49, 2.34),
    new THREE.Vector2(0.39, 2.48),
    new THREE.Vector2(0.38, 2.54),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPts, 60);
  const initSpec =
    STUDIO_FINISHES.find((f) => f.id === opts.finish) || STUDIO_FINISHES[0];
  let brandTex = createBrandWrapTexture(
    initSpec.hex,
    initSpec.logoInk,
    SIZE_SPECS[opts.size].label,
    Boolean(initSpec.isGlass),
    1024,
    { text: opts.engravingText, font: opts.engravingFont },
    opts.maxAnisotropy
  );

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: brandTex,
    roughness: initSpec.roughness,
    metalness: initSpec.metalness,
    clearcoat: initSpec.clearcoat,
    clearcoatRoughness: 0.18,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.rotation.y = -Math.PI / 2;
  bodyMesh.castShadow = !opts.isSoftwareGl;
  bodyMesh.receiveShadow = !opts.isSoftwareGl;
  innerGroup.add(bodyMesh);

  // 3. Internal Pure Water Volume (for Transparent glass finish)
  const waterGeo = new THREE.CylinderGeometry(0.525, 0.52, 1.72, 44);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    roughness: 0.06,
    metalness: 0.0,
    transmission: opts.isSoftwareGl ? 0 : 0.82,
    thickness: 0.9,
    ior: 1.333,
    transparent: true,
    opacity: opts.isSoftwareGl ? 0.55 : 0.88,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = 1.02;
  innerGroup.add(waterMesh);

  // 4. Machined 18/8 Brushed Stainless Neck Collar
  const collarPts = [
    new THREE.Vector2(0.37, 2.46),
    new THREE.Vector2(0.405, 2.48),
    new THREE.Vector2(0.41, 2.66),
    new THREE.Vector2(0.365, 2.69),
    new THREE.Vector2(0.34, 2.66),
  ];
  const collarGeo = new THREE.LatheGeometry(collarPts, 52);
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3e8,
    roughness: 0.22,
    metalness: 0.92,
  });
  const collarMesh = new THREE.Mesh(collarGeo, steelMat);
  collarMesh.castShadow = !opts.isSoftwareGl;
  innerGroup.add(collarMesh);

  // 5. Silicone Leakproof O-Ring Gasket
  const gasketGeo = new THREE.TorusGeometry(0.395, 0.022, 14, 44);
  const gasketMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.72,
    metalness: 0.05,
  });
  const gasketMesh = new THREE.Mesh(gasketGeo, gasketMat);
  gasketMesh.rotation.x = Math.PI / 2;
  gasketMesh.position.y = 2.69;
  innerGroup.add(gasketMesh);

  // 6. Chug Lid Dome
  const lidPts = [
    new THREE.Vector2(0.36, 2.68),
    new THREE.Vector2(0.43, 2.7),
    new THREE.Vector2(0.435, 3.04),
    new THREE.Vector2(0.4, 3.12),
    new THREE.Vector2(0.32, 3.14),
    new THREE.Vector2(0.01, 3.145),
  ];
  const lidGeo = new THREE.LatheGeometry(lidPts, 52);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x161c22,
    roughness: 0.56,
    metalness: 0.12,
  });
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.castShadow = !opts.isSoftwareGl;
  innerGroup.add(lidMesh);

  // 7. Knurled Grip Ribs (InstancedMesh)
  const ribCount = 36;
  const ribGeo = new THREE.BoxGeometry(0.016, 0.24, 0.024);
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x1f2830,
    roughness: 0.65,
    metalness: 0.14,
  });
  const ribInst = new THREE.InstancedMesh(ribGeo, ribMat, ribCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ribCount; i++) {
    const angle = (i / ribCount) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 0.435, 2.87, Math.sin(angle) * 0.435);
    dummy.rotation.set(0, -angle, 0);
    dummy.updateMatrix();
    ribInst.setMatrixAt(i, dummy.matrix);
  }
  ribInst.computeBoundingSphere();
  innerGroup.add(ribInst);

  // 8. Carry Loop Arch
  const loopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.39, 2.95, 0),
    new THREE.Vector3(-0.46, 3.36, 0),
    new THREE.Vector3(-0.22, 3.62, 0),
    new THREE.Vector3(0.0, 3.68, 0),
    new THREE.Vector3(0.22, 3.62, 0),
    new THREE.Vector3(0.46, 3.36, 0),
    new THREE.Vector3(0.39, 2.95, 0),
  ]);
  const loopGeo = new THREE.TubeGeometry(loopCurve, 40, 0.052, 14, false);
  const loopMat = new THREE.MeshStandardMaterial({
    color: 0x1a2229,
    roughness: 0.48,
    metalness: 0.18,
  });
  const loopMesh = new THREE.Mesh(loopGeo, loopMat);
  loopMesh.castShadow = !opts.isSoftwareGl;
  innerGroup.add(loopMesh);

  // 9. Steel Hinge Pin
  const pinGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.9, 18);
  const pinMesh = new THREE.Mesh(pinGeo, steelMat);
  pinMesh.rotation.z = Math.PI / 2;
  pinMesh.position.y = 2.95;
  innerGroup.add(pinMesh);

  const applyConfig = (cfg: {
    finish: StudioFinishKey;
    size: StudioSizeKey;
    engravingText: string;
    engravingFont: 'sans' | 'serif' | 'mono';
    showBoot: boolean;
  }) => {
    const spec =
      STUDIO_FINISHES.find((f) => f.id === cfg.finish) || STUDIO_FINISHES[0];
    const sz = SIZE_SPECS[cfg.size];

    const nextTex = createBrandWrapTexture(
      spec.hex,
      spec.logoInk,
      sz.label,
      Boolean(spec.isGlass),
      1024,
      { text: cfg.engravingText, font: cfg.engravingFont },
      opts.maxAnisotropy
    );
    brandTex.dispose();
    brandTex = nextTex;
    bodyMat.map = brandTex;
    bodyMat.roughness = spec.roughness;
    bodyMat.metalness = spec.metalness;
    bodyMat.clearcoat = spec.clearcoat;

    if (spec.isGlass) {
      bodyMat.transparent = true;
      bodyMat.opacity = opts.isSoftwareGl ? 0.42 : 0.46;
      bodyMat.transmission = opts.isSoftwareGl ? 0 : 0.72;
      bodyMat.ior = 1.48;
      bodyMat.thickness = 0.45;
      bodyMat.depthWrite = false;
    } else {
      bodyMat.transparent = false;
      bodyMat.opacity = 1.0;
      bodyMat.transmission = 0;
      bodyMat.depthWrite = true;
    }
    bodyMat.needsUpdate = true;

    bootMat.color.set(spec.bootHex);
    bootMesh.visible = cfg.showBoot;
    waterMesh.visible = Boolean(spec.isGlass);

    innerGroup.scale.set(
      sz.scaleXZ * AR_METER_SCALE,
      sz.scaleY * AR_METER_SCALE,
      sz.scaleXZ * AR_METER_SCALE
    );
  };

  applyConfig(opts);

  return {
    group,
    updateConfig: applyConfig,
    updateWaterBob: (elapsed: number) => {
      waterMesh.position.y = 1.02 + Math.sin(elapsed * 1.8) * 0.015;
    },
    dispose: () => {
      brandTex.dispose();
      bootGeo.dispose();
      bootMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      collarGeo.dispose();
      steelMat.dispose();
      gasketGeo.dispose();
      gasketMat.dispose();
      lidGeo.dispose();
      lidMat.dispose();
      ribGeo.dispose();
      ribMat.dispose();
      loopGeo.dispose();
      loopMat.dispose();
      pinGeo.dispose();
    },
  };
}

/**
 * Composite true-scale Desk Reference Props (14" Aluminum Laptop + 6.7" Smartphone + Ceramic Espresso Mug)
 * in exact real-world meters (y = 0 grounded).
 */
export function createDeskReferenceProps(isSoftwareGl: boolean): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // --- 14" Anodized Aluminum Laptop (31.2 cm x 22.1 cm) ---
  const laptopGroup = new THREE.Group();
  laptopGroup.position.set(-0.21, 0, -0.05);
  laptopGroup.rotation.y = 0.24;

  const aluMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.28,
      metalness: 0.85,
    })
  );
  const deckMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.12,
    })
  );
  const trackpadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.16,
      metalness: 0.45,
    })
  );
  const screenMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
    })
  );

  // Base chassis (bottom at y = 0)
  const baseChassis = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.312, 0.011, 0.221)),
    aluMat
  );
  baseChassis.position.y = 0.0055;
  baseChassis.castShadow = !isSoftwareGl;
  baseChassis.receiveShadow = !isSoftwareGl;
  laptopGroup.add(baseChassis);

  // Recessed dark keyboard well
  const kbWell = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.275, 0.002, 0.108)),
    deckMat
  );
  kbWell.position.set(0, 0.0115, -0.025);
  laptopGroup.add(kbWell);

  // Glass haptic trackpad
  const trackpad = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.11, 0.0015, 0.068)),
    trackpadMat
  );
  trackpad.position.set(0, 0.0115, 0.068);
  laptopGroup.add(trackpad);

  // Hinged display lid angled back at 108 deg
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.011, -0.106);
  lidPivot.rotation.x = -0.28;
  const lidBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.312, 0.212, 0.006)),
    aluMat
  );
  lidBack.position.set(0, 0.106, -0.003);
  lidBack.castShadow = !isSoftwareGl;
  lidPivot.add(lidBack);

  const screenGlass = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.296, 0.194)),
    screenMat
  );
  screenGlass.position.set(0, 0.107, 0.0008);
  lidPivot.add(screenGlass);
  laptopGroup.add(lidPivot);
  group.add(laptopGroup);

  // --- 6.7" Flagship Smartphone (7.7 cm x 16.0 cm) ---
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(0.175, 0, 0.075);
  phoneGroup.rotation.y = -0.32;

  const titaniumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.82,
    })
  );
  const phoneBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.077, 0.0085, 0.16)),
    titaniumMat
  );
  phoneBody.position.y = 0.00425;
  phoneBody.castShadow = !isSoftwareGl;
  phoneGroup.add(phoneBody);

  const phoneScreen = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.072, 0.001, 0.153)),
    screenMat
  );
  phoneScreen.position.y = 0.0086;
  phoneGroup.add(phoneScreen);
  group.add(phoneGroup);

  // --- Matte Ceramic Espresso Cup (8.0 cm dia x 9.2 cm height) ---
  const mugGroup = new THREE.Group();
  mugGroup.position.set(0.195, 0, -0.115);

  const ceramicMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1ece4,
      roughness: 0.58,
      metalness: 0.02,
    })
  );
  const coffeeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c1810,
      roughness: 0.12,
      metalness: 0.05,
    })
  );
  const mugBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.036, 0.092, 36)),
    ceramicMat
  );
  mugBody.position.y = 0.046;
  mugBody.castShadow = !isSoftwareGl;
  mugBody.receiveShadow = !isSoftwareGl;
  mugGroup.add(mugBody);

  const coffeeTop = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.035, 32)),
    coffeeMat
  );
  coffeeTop.rotation.x = -Math.PI / 2;
  coffeeTop.position.y = 0.088;
  mugGroup.add(coffeeTop);

  const mugHandle = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.024, 0.0055, 12, 24, Math.PI)),
    ceramicMat
  );
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.position.set(0.038, 0.048, 0);
  mugGroup.add(mugHandle);
  group.add(mugGroup);

  return {
    group,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

/**
 * Composite true-scale Gym Bench Props (Hex Dumbbell + Folded Microfiber Towel) in meters.
 */
export function createGymReferenceProps(isSoftwareGl: boolean): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // Hex Rubber Dumbbell (28 cm total width, 11 cm hex head diameter)
  const dbGroup = new THREE.Group();
  dbGroup.position.set(-0.18, 0, -0.04);
  dbGroup.rotation.y = 0.42;

  const rubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.94,
    })
  );

  const hexGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.072, 6));
  const leftWeight = new THREE.Mesh(hexGeo, rubberMat);
  leftWeight.rotation.z = Math.PI / 2;
  leftWeight.position.set(-0.105, 0.0485, 0);
  leftWeight.castShadow = !isSoftwareGl;
  dbGroup.add(leftWeight);

  const rightWeight = new THREE.Mesh(hexGeo, rubberMat);
  rightWeight.rotation.z = Math.PI / 2;
  rightWeight.position.set(0.105, 0.0485, 0);
  rightWeight.castShadow = !isSoftwareGl;
  dbGroup.add(rightWeight);

  const bar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 20)),
    chromeMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.0485;
  bar.castShadow = !isSoftwareGl;
  dbGroup.add(bar);
  group.add(dbGroup);

  // Folded Performance Gym Towel (22 cm x 14 cm x 3.2 cm)
  const towelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  const towel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.028, 0.13)),
    towelMat
  );
  towel.position.set(0.17, 0.014, -0.06);
  towel.rotation.y = -0.22;
  towel.castShadow = !isSoftwareGl;
  towel.receiveShadow = !isSoftwareGl;
  group.add(towel);

  return {
    group,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}
