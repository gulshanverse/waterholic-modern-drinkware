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

