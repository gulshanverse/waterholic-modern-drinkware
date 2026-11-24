import { useEffect, useState, type CSSProperties } from 'react';
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
  onError,
}: BottleColorImageProps) {
  const needsRecolor = Boolean(finish && finish.filter);
  const [displaySrc, setDisplaySrc] = useState<string>(src);

  useEffect(() => {
    let active = true;

    if (!needsRecolor || !finish) {
      setDisplaySrc(src);
      return;
    }

    getRecoloredBottleUrl(src, finish, maxDimension).then((nextUrl) => {
      if (active) {
        setDisplaySrc(nextUrl);
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

  return (
    <img
      src={displaySrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
      onError={onError}
    />
  );
}
