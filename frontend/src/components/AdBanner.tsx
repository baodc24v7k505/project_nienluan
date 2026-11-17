import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveAds } from "../api/ads";
export function AdBanner() {
  const { data: ads } = useQuery({
    queryKey: ["active-ads"],
    queryFn: getActiveAds,
  });
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (
      !ads ||
      ads.length < 2 ||
      paused ||
      interacting ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % ads.length),
      7000,
    );
    return () => clearInterval(timer);
  }, [ads, paused, interacting]);
  const ad = ads?.[index % (ads.length || 1)];
  return (
    <section
      className="mb-9 grid overflow-hidden rounded-3xl bg-[#f7e8df] md:grid-cols-[1.05fr_1fr]"
      aria-label="Khám phá mua sắm"
    >
      <div className="flex flex-col items-start justify-center px-6 py-8 md:px-10 md:py-10">
        <span className="mb-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#a5694c]">
          Khám phá mỗi ngày
        </span>
        <h1 className="max-w-md text-3xl font-semibold leading-[1.2] tracking-tight text-[#3f302b] lg:text-[42px]">
          Tìm đúng món.
          <br />
          Mua đúng nhu cầu.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-[#80695d]">
          Khám phá sản phẩm từ nhiều gian hàng, lựa chọn phân loại phù hợp và
          mua sắm theo cách của bạn.
        </p>
        <a
          href="#catalog"
          className="btn mt-6 bg-[#3f302b] text-white hover:bg-[#59443b]"
        >
          Khám phá sản phẩm{" "}
          <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
        </a>
      </div>
      <div
        className="relative hidden min-h-64 flex-col items-center justify-center bg-[#efded2] md:flex"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
        }}
      >
        {ad ? (
          <>
            <div className="relative min-h-44 w-full flex-1 overflow-hidden bg-white">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,#fff7ed,#dec1ad)]"
              >
                <span className="flex h-40 w-40 -rotate-12 items-center justify-center rounded-[40px] bg-white/30 text-7xl text-[#bd7853]">
                  <i className="fas fa-bag-shopping" />
                </span>
              </div>
              <img
                key={ad.id}
                src={ad.imageUrl}
                alt={ad.title}
                className="absolute inset-0 h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="w-full shrink-0 bg-slate-900 px-6 py-5 text-white">
              <span className="text-[9px] uppercase tracking-widest text-white/60">
                Quảng cáo · {ad.shop?.name}
              </span>
              <p className="mt-1 text-lg font-medium">{ad.title}</p>
              {ad.linkUrl && (
                <a
                  href={ad.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xs text-white/90"
                >
                  Xem ưu đãi{" "}
                  <i
                    className="fas fa-arrow-up-right-from-square text-[10px]"
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
            {ads && ads.length > 1 && (
              <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1.5">
                {ads.map((a, i) => (
                  <button
                    key={a.id}
                    aria-label={`Banner ${i + 1}`}
                    aria-pressed={index % ads.length === i}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${index % ads.length === i ? "w-5 bg-slate-800" : "w-1.5 bg-slate-300"}`}
                  />
                ))}
                <button
                  aria-label={
                    paused ? "Tiếp tục quảng cáo" : "Tạm dừng quảng cáo"
                  }
                  onClick={() => setPaused(!paused)}
                  className="ml-1 px-1 text-[10px] text-slate-500"
                >
                  <i
                    aria-hidden="true"
                    className={`fas ${paused ? "fa-play" : "fa-pause"}`}
                  />
                </button>
              </div>
            )}
          </>
        ) : (
          <svg
            width="300"
            height="270"
            viewBox="0 0 300 270"
            role="img"
            aria-label="Túi mua sắm"
          >
            <ellipse cx="151" cy="239" rx="103" ry="13" fill="#dfc7b5" />
            <rect
              x="52"
              y="105"
              width="104"
              height="123"
              rx="10"
              fill="#f8f3ed"
              transform="rotate(-10 52 105)"
            />
            <path
              d="M76 111V81a25 25 0 0 1 50 0v23"
              fill="none"
              stroke="#ac8e77"
              strokeWidth="6"
            />
            <rect
              x="132"
              y="93"
              width="111"
              height="145"
              rx="10"
              fill="#d97b50"
              transform="rotate(7 132 93)"
            />
            <path
              d="M155 103V75a27 27 0 0 1 54 0v32"
              fill="none"
              stroke="#a45b3d"
              strokeWidth="6"
            />
            <path
              d="m173 157 14 15 27-28"
              fill="none"
              stroke="#ffeadc"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="69" cy="52" r="8" fill="#f8f3ed" />
            <path
              d="m250 60 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"
              fill="#bd9274"
            />
          </svg>
        )}
      </div>
      {ad && (
        <div className="flex items-center justify-between gap-3 px-6 pb-5 text-xs text-[#80695d] md:hidden">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-white/40">
            <i
              aria-hidden="true"
              className="fas fa-bag-shopping absolute inset-0 flex items-center justify-center text-xl text-[#bd7853]"
            />
            <img
              key={ad.id}
              src={ad.imageUrl}
              alt=""
              className="relative h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[9px] uppercase tracking-wide opacity-70">
              Quảng cáo
            </p>
            <span className="line-clamp-2">{ad.title}</span>
          </div>
          {ad.linkUrl && (
            <a
              href={ad.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-semibold"
            >
              Xem ưu đãi ↗
            </a>
          )}
        </div>
      )}
    </section>
  );
}
