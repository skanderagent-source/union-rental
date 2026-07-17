import type { ImgHTMLAttributes, VideoHTMLAttributes } from 'react';
import { getSafeMediaUrl } from '@/lib/safeUrl';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src: string | null | undefined;
  alt?: string;
  /** Decorative thumbnails/buttons — forces empty alt. */
  decorative?: boolean;
};

type SafeVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> & {
  src: string | null | undefined;
};

export function SafeImage({ src, alt = '', decorative = false, ...props }: SafeImageProps) {
  const safeSrc = getSafeMediaUrl(src);
  if (!safeSrc) return null;
  return <img src={safeSrc} alt={decorative ? '' : alt} {...props} />;
}

export function SafeVideo({ src, ...props }: SafeVideoProps) {
  const safeSrc = getSafeMediaUrl(src);
  if (!safeSrc) return null;
  return <video src={safeSrc} {...props} />;
}
