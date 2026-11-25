// Safe WebXR Device API helpers for Three.js immersive-ar + hit-test + DOM Overlay

export const AR_METER_SCALE = 0.075; // 3.68 scene units * 0.075 = 0.276m (27.6 cm for 950 ml)

export async function checkWebXrArSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const xr = navigator.xr;
  if (!xr || typeof xr.isSessionSupported !== 'function') {
    return false;
  }
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

export async function requestWebXrArSession(
  domOverlayRoot: HTMLElement | null
): Promise<{ session: XRSession; hasHitTest: boolean }> {
  const xr = typeof navigator !== 'undefined' ? navigator.xr : undefined;
  if (!xr || typeof xr.requestSession !== 'function') {
    throw new Error('WebXR API not available in this browser');
  }

  const domOverlayConfig = domOverlayRoot
    ? { domOverlay: { root: domOverlayRoot } }
    : {};

  // Attempt full hardware surface hit-test + DOM overlay first
  try {
    const session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
      ...domOverlayConfig,
    });
    return { session, hasHitTest: true };
  } catch {
    // Graceful fallback: request immersive-ar with optional hit-test
    const session = await xr.requestSession('immersive-ar', {
      optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'],
      ...domOverlayConfig,
    });
    return { session, hasHitTest: false };
  }
}
