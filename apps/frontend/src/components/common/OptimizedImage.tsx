import type { ImgHTMLAttributes } from 'react';

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'loading'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Decorative images must use empty alt text. */
  decorative?: boolean;
  /** LCP / above-the-fold images — eager load with high fetch priority. */
  priority?: boolean;
  webpSrc?: string;
};

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  decorative = false,
  priority = false,
  webpSrc,
  className,
  ...props
}: OptimizedImageProps) {
  const img = (
    <img
      src={src}
      alt={decorative ? '' : alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      {...props}
    />
  );

  if (webpSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        {img}
      </picture>
    );
  }

  return img;
}
