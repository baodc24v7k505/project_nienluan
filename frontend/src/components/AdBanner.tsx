import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveAds } from '../api/ads';

export function AdBanner() {
  const { data: ads } = useQuery({ queryKey: ['active-ads'], queryFn: getActiveAds });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!ads || ads.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(timer);
  }, [ads]);

  if (!ads || ads.length === 0) {
    return (
      <div className="mb-6 flex h-32 items-center justify-center rounded-sm bg-gradient-to-r from-brand to-brand-light text-white shadow-sm md:h-48">
        <p className="text-lg font-semibold md:text-2xl">Chào mừng đến với Sàn TMĐT</p>
      </div>
    );
  }

  const ad = ads[index];
  const content = (
    <img src={ad.imageUrl} alt={ad.title} className="h-32 w-full rounded-sm object-cover shadow-sm md:h-48" />
  );

  return (
    <div className="relative mb-6">
      {ad.linkUrl ? (
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        content
      )}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {ads.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
