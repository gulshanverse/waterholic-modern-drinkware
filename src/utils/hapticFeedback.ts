import gsap from 'gsap';

/**
 * Triggers subtle GSAP-based 'haptic-like' visual feedback on an Add to Bag
 * button: a crisp tactile scale-down detent, elastic rebound with soft accent
 * glow, an expanding radial pulse ring, and a synced micro-pulse on the
 * header bag trigger (#bag-trigger).
 *
 * Fully respects prefers-reduced-motion and cleans up inline transforms on
 * completion so hover/focus CSS transitions remain crisp.
 */
export function triggerMicroHapticTick() {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(6);
    }
  } catch {
    // Ignore unsupported or restricted vibration APIs
  }
}

export function triggerAddToBagHaptic(
  buttonEl: HTMLElement | null | undefined,
  options?: { pulseBagTrigger?: boolean; skipVibrate?: boolean }
) {
  if (typeof window === 'undefined') return;

  // Optional subtle hardware vibration on supported mobile devices
  if (!options?.skipVibrate) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
    } catch {
      // Ignore unsupported or restricted vibration APIs
    }
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (reducedMotion) return;

  if (buttonEl) {
    // Ensure button can host the expanding pulse ring without shifting layout
    const computedPos = window.getComputedStyle(buttonEl).position;
    if (computedPos === 'static') {
      buttonEl.style.position = 'relative';
    }

    // Spawn expanding radial pulse ring
    const ring = document.createElement('span');
    ring.className = 'gsap-haptic-ring';
    ring.setAttribute('aria-hidden', 'true');
    buttonEl.appendChild(ring);

    gsap.fromTo(
      ring,
      {
        scale: 0.94,
        opacity: 0.72,
      },
      {
        scale: 1.24,
        opacity: 0,
        duration: 0.52,
        ease: 'power2.out',
        onComplete: () => {
          ring.remove();
        },
      }
    );

    // Tactile GSAP detent -> elastic pulse rebound -> clean settle
    gsap.killTweensOf(buttonEl, 'scale,y,boxShadow');
    const accentColor =
      window.getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
      '#0284c7';

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(buttonEl, { clearProps: 'transform,boxShadow' });
      },
    });

    tl.to(buttonEl, {
      scale: 0.91,
      y: 1.5,
      duration: 0.085,
      ease: 'power3.out',
      overwrite: 'auto',
    })
      .to(buttonEl, {
        scale: 1.045,
        y: -1,
        boxShadow: `0 0 0 6px color-mix(in srgb, ${accentColor} 28%, transparent)`,
        duration: 0.19,
        ease: 'back.out(2.6)',
      })
      .to(buttonEl, {
        scale: 1,
        y: 0,
        boxShadow: '0 0 0 0px transparent',
        duration: 0.24,
        ease: 'power2.out',
      });
  }

  // Synced confirmation pulse on the header Bag button
  if (options?.pulseBagTrigger !== false) {
    const bagBtn = document.getElementById('bag-trigger');
    if (bagBtn) {
      gsap.killTweensOf(bagBtn, 'scale');
      gsap
        .timeline({
          delay: 0.09,
          onComplete: () => {
            gsap.set(bagBtn, { clearProps: 'transform' });
          },
        })
        .to(bagBtn, {
          scale: 1.16,
          duration: 0.14,
          ease: 'power2.out',
        })
        .to(bagBtn, {
          scale: 1,
          duration: 0.28,
          ease: 'elastic.out(1, 0.55)',
        });
    }
  }
}

/**
 * Triggers instant tactile haptic feedback when a user completes a swipe-up
 * gesture on a catalog product image: crisp hardware double-pulse vibration,
 * upward spring launch & settle on the bottle image, an expanding accent pulse
 * ring across the media surface, and synced Add to Bag + header Bag pulses.
 */
export function triggerSwipeUpAddHaptic(
  mediaEl: HTMLElement | null | undefined,
  bottleWrapEl: HTMLElement | null | undefined,
  addBtnEl?: HTMLElement | null
) {
  if (typeof window === 'undefined') return;

  // Distinct crisp double-pulse hardware haptic on supported devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([14, 24, 10]);
    }
  } catch {
    // Ignore unsupported or restricted vibration APIs
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (!reducedMotion) {
    if (mediaEl) {
      const ring = document.createElement('span');
      ring.className = 'gsap-haptic-ring gsap-swipe-haptic-ring';
      ring.setAttribute('aria-hidden', 'true');
      mediaEl.appendChild(ring);

      gsap.fromTo(
        ring,
        { scale: 0.92, opacity: 0.78 },
        {
          scale: 1.06,
          opacity: 0,
          duration: 0.46,
          ease: 'power2.out',
          onComplete: () => {
            ring.remove();
          },
        }
      );
    }

    if (bottleWrapEl) {
      gsap.killTweensOf(bottleWrapEl, 'y,scale');
      gsap
        .timeline({
          onComplete: () => {
            gsap.set(bottleWrapEl, { clearProps: 'transform' });
          },
        })
        .to(bottleWrapEl, {
          y: -16,
          scale: 1.04,
          duration: 0.13,
          ease: 'power3.out',
        })
        .to(bottleWrapEl, {
          y: 2,
          scale: 0.985,
          duration: 0.12,
          ease: 'power2.inOut',
        })
        .to(bottleWrapEl, {
          y: 0,
          scale: 1,
          duration: 0.24,
          ease: 'back.out(2.2)',
        });
    }
  }

  // Sync card Add to Bag button & header Bag trigger without double-vibrating
  triggerAddToBagHaptic(addBtnEl, { pulseBagTrigger: true, skipVibrate: true });
}

/**
 * Launches a lightweight compositor-only particle from a clicked '+' quick-add
 * button toward the header shopping bag trigger (#bag-trigger).
 * Automatically skips when prefers-reduced-motion is enabled.
 */
export function triggerFlyToBagAnimation(originEl: HTMLElement | null | undefined) {
  if (typeof window === 'undefined' || !originEl) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (reducedMotion) return;

  const bagBtn = document.getElementById('bag-trigger');
  if (!bagBtn) return;

  const originRect = originEl.getBoundingClientRect();
  const targetRect = bagBtn.getBoundingClientRect();
  if (!originRect.width || !targetRect.width) return;

  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top + originRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  const dot = document.createElement('span');
  dot.className = 'gsap-fly-bag-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  document.body.appendChild(dot);

  const dx = endX - startX;
  const dy = endY - startY;

  gsap
    .timeline({
      onComplete: () => {
        dot.remove();
      },
    })
    .fromTo(
      dot,
      {
        x: 0,
        y: 0,
        scale: 0.65,
        opacity: 0.95,
      },
      {
        x: dx * 0.42,
        y: dy * 0.48 - 44,
        scale: 1.15,
        opacity: 1,
        duration: 0.22,
        ease: 'power2.out',
      }
    )
    .to(dot, {
      x: dx,
      y: dy,
      scale: 0.35,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
    });
}

const HEART_SVG_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const HEART_BURST_PALETTE_LIGHT = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af'];
const HEART_BURST_PALETTE_DARK = ['#fb7185', '#fda4af', '#f43f5e', '#fecdd3'];

/**
 * Triggers a subtle compositor-only ('transform', 'opacity') radial heart-burst
 * particle animation anchored to the toggled wishlist button.
 *
 * - On save (nextSaved === true): renders a soft expanding rose halo ring,
 *   4 tiny SVG hearts, and 4 micro sparkle dots radiating outward from the
 *   button center, plus a subtle elastic icon pop on the trigger's heart SVG.
 * - On unsave (nextSaved === false): renders a restrained 4-dot soft release
 *   so toggling off feels acknowledged without competing with saving.
 *
 * Automatically skips all motion when prefers-reduced-motion is enabled and
 * cleans up spawned DOM elements upon completion.
 */
export function triggerHeartBurstAnimation(
  originEl: HTMLElement | null | undefined,
  nextSaved: boolean
) {
  if (typeof window === 'undefined') return;

  // Optional subtle hardware vibration on supported mobile devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(nextSaved ? [8, 18, 6] : 5);
    }
  } catch {
    // Ignore unsupported or restricted vibration APIs
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (reducedMotion || !originEl) return;

  const rect = originEl.getBoundingClientRect();
  if (!rect.width && !rect.height) return;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark';
  const palette = isDark ? HEART_BURST_PALETTE_DARK : HEART_BURST_PALETTE_LIGHT;

  // Subtle tactile pop on the button's heart icon if present (for buttons not using Framer keyframe pop)
  if (!originEl.classList.contains('wishlist-btn')) {
    const iconSvg = originEl.querySelector('svg');
    if (iconSvg) {
      gsap.killTweensOf(iconSvg, 'scale');
      gsap
        .timeline({
          onComplete: () => {
            gsap.set(iconSvg, { clearProps: 'transform' });
          },
        })
        .to(iconSvg, {
          scale: nextSaved ? 1.28 : 0.86,
          duration: 0.14,
          ease: 'power2.out',
        })
        .to(iconSvg, {
          scale: 1,
          duration: 0.26,
          ease: nextSaved ? 'back.out(2.6)' : 'power2.out',
        });
    }
  }

  const layer = document.createElement('span');
  layer.className = 'heart-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${cx}px`;
  layer.style.top = `${cy}px`;
  document.body.appendChild(layer);

  const tl = gsap.timeline({
    onComplete: () => {
      layer.remove();
    },
  });

  if (nextSaved) {
    // Soft expanding rose ring
    const ring = document.createElement('span');
    ring.className = 'heart-burst-ring';
    layer.appendChild(ring);

    tl.fromTo(
      ring,
      { scale: 0.45, opacity: 0.65 },
      {
        scale: 2.1,
        opacity: 0,
        duration: 0.46,
        ease: 'power2.out',
      },
      0
    );

    const totalParticles = 8;
    const baseOffset = -Math.PI / 2 + (Math.random() - 0.5) * 0.35;

    for (let i = 0; i < totalParticles; i++) {
      const isHeart = i % 2 === 0;
      const angle =
        baseOffset +
        (i / totalParticles) * Math.PI * 2 +
        (Math.random() - 0.5) * 0.28;
      const distance = isHeart
        ? 23 + Math.random() * 14
        : 18 + Math.random() * 12;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - (isHeart ? 5 : 2);
      const color = palette[i % palette.length];
      const delay = isHeart ? 0.015 * (i % 3) : 0.03 + 0.015 * (i % 3);
      const duration = isHeart
        ? 0.48 + Math.random() * 0.1
        : 0.38 + Math.random() * 0.08;

      if (isHeart) {
        const size = 8 + Math.round(Math.random() * 3);
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('class', 'heart-burst-heart');
        svg.style.color = color;

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', HEART_SVG_PATH);
        path.setAttribute('fill', 'currentColor');
        svg.appendChild(path);
        layer.appendChild(svg);

        const rotation = (Math.random() - 0.5) * 42;
        tl.fromTo(
          svg,
          { x: 0, y: 0, scale: 0.3, rotation: 0, opacity: 0.95 },
          {
            x: targetX,
            y: targetY,
            scale: 1.05,
            rotation,
            opacity: 0.92,
            duration: duration * 0.45,
            ease: 'power3.out',
          },
          delay
        ).to(
          svg,
          {
            x: targetX * 1.14,
            y: targetY * 1.14 - 4,
            scale: 0.2,
            opacity: 0,
            duration: duration * 0.55,
            ease: 'power2.in',
          },
          delay + duration * 0.45
        );
      } else {
        const dot = document.createElement('span');
        dot.className = 'heart-burst-dot';
        const dotSize = 3.5 + Math.random() * 1.8;
        dot.style.width = `${dotSize}px`;
        dot.style.height = `${dotSize}px`;
        dot.style.backgroundColor = color;
        layer.appendChild(dot);

        tl.fromTo(
          dot,
          { x: 0, y: 0, scale: 0.45, opacity: 0.85 },
          {
            x: targetX,
            y: targetY,
            scale: 1,
            opacity: 0.85,
            duration: duration * 0.42,
            ease: 'power3.out',
          },
          delay
        ).to(
          dot,
          {
            x: targetX * 1.12,
            y: targetY * 1.12,
            scale: 0,
            opacity: 0,
            duration: duration * 0.58,
            ease: 'power2.in',
          },
          delay + duration * 0.42
        );
      }
    }
  } else {
    // Subtle muted dissipation when removing from wishlist
    const dotCount = 4;
    const baseAngle = Math.PI / 4 + (Math.random() - 0.5) * 0.35;
    for (let i = 0; i < dotCount; i++) {
      const angle = baseAngle + (i / dotCount) * Math.PI * 2;
      const distance = 13 + Math.random() * 6;
      const dot = document.createElement('span');
      dot.className = 'heart-burst-dot is-muted';
      dot.style.width = '3.5px';
      dot.style.height = '3.5px';
      layer.appendChild(dot);

      tl.fromTo(
        dot,
        { x: 0, y: 0, scale: 0.8, opacity: 0.48 },
        {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          scale: 0.15,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
        },
        0
      );
    }
  }
}



