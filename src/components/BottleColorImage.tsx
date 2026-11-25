import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  getRecoloredBottleUrl,
  type BottleFinishSpec,
} from '../utils/recolorBottle';

interface BottleColorImageProps {
  src: string;
  alt: string;
  finish?: BottleFinishSpec | null;
  className?: string;
  style?: CSSProperties;
  loading?: 'lazy' | 'eager';
  maxDimension?: number;
  showShimmer?: boolean;
  draggable?: boolean;
  onError?: () => void;
}

/**
 * Renders a product photograph where alternate colour finishes recolor ONLY
 * the foreground bottle/product via Canvas segmentation, keeping the entire
 * studio background, lighting, and surface 100% unchanged.
 */
export function BottleColorImage({
  src,
  alt,
  finish,
  className,
  style,
  loading,
  maxDimension = 560,
  showShimmer = true,
  draggable,
  onError,
}: BottleColorImageProps) {
  const needsRecolor = Boolean(finish && finish.filter);
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isRecoloring, setIsRecoloring] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [displaySrc]);

  useEffect(() => {
    let active = true;

    if (!needsRecolor || !finish) {
      setIsRecoloring(false);
      setDisplaySrc(src);
      return;
    }

    setIsRecoloring(true);
    getRecoloredBottleUrl(src, finish, maxDimension)
      .then((nextUrl) => {
        if (active) {
          setDisplaySrc(nextUrl);
          setIsRecoloring(false);
        }
      })
      .catch(() => {
        if (active) {
          setIsRecoloring(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    src,
    needsRecolor,
    finish?.id,
    finish?.hex,
    finish?.isTransparent,
    finish?.filter,
    maxDimension,
  ]);

  const busy = showShimmer && (!isLoaded || isRecoloring);

  return (
    <span className={`bottle-img-shimmer-host${busy ? ' is-loading' : ''}`}>
      {busy && <span className="bottle-img-shimmer-veil skel-block" aria-hidden="true" />}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        loading={loading}
        draggable={draggable}
        referrerPolicy="no-referrer"
        className={`${className ?? ''}${isLoaded ? ' is-img-ready' : ' is-img-pending'}`.trim()}
        style={style}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsLoaded(true);
          onError?.();
        }}
      />
    </span>
  );
}
