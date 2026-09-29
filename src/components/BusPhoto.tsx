/**
 * Real MSRTC bus photographs from Wikimedia Commons (CC BY / CC BY-SA),
 * stored under public/buses/photos with credits in credits.json. Service
 * types without a freely-licensed photo fall back to their illustration.
 */
export interface PhotoCredit {
  src: string;
  author: string;
  license: string;
  source: string;
}

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

export const BUS_PHOTOS: Record<string, PhotoCredit> = {
  express: { src: '/icons/Semi_laxary.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  ashwamedh: { src: '/icons/E-Shivneri.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  shivshahi: { src: '/icons/Shivshahi.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  shivneri: { src: '/icons/Shivneri.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  shivai: { src: '/icons/E-Shivai2.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  hirkani: { src: '/icons/Hirkani.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  yashwanti: { src: '/icons/Jijau.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
  'bus-stand': { src: '/buses/photos/bus-stand.jpg', author: 'Shrutuja Shirke', license: 'CC BY-SA 3.0', source: `${COMMONS}Swargate_Bus_Stand.JPG` },
  ordinary: { src: '/icons/lalpari.png', author: 'MSRTC', license: 'Official', source: 'MSRTC Official' },
};

export function busPhoto(serviceId: string): PhotoCredit | undefined {
  return BUS_PHOTOS[serviceId];
}

export function PhotoCreditLine({ credit, className = '' }: { credit: PhotoCredit; className?: string }) {
  return (
    <a
      href={credit.source}
      target="_blank"
      rel="noopener noreferrer"
      className={`block truncate text-[10px] text-slate-400 hover:text-slate-600 ${className}`}
    >
      Photo: {credit.author} · {credit.license} · Wikimedia Commons
    </a>
  );
}

/** Photo if one exists, else the service's illustration. */
export function BusImage({
  serviceId,
  fallback,
  alt,
  className = '',
}: {
  serviceId: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  const p = busPhoto(serviceId);
  if (p) return <img src={p.src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  return <img src={fallback} alt={alt} loading="lazy" className={`object-contain bg-[#f3f2ee] p-3 ${className}`} />;
}
