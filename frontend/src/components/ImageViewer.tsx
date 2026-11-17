import { useState } from "react";
import { Dialog } from "./Dialog";
export function ImageViewer({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const move = (step: number) =>
    setIndex((i) => (i + step + images.length) % images.length);
  return (
    <Dialog title={`Ảnh ${index + 1} / ${images.length}`} onClose={onClose}>
      <div
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") move(-1);
          if (e.key === "ArrowRight") move(1);
        }}
      >
        <img
          src={images[index]}
          alt={`Ảnh phóng to ${index + 1}`}
          className="max-h-[60svh] w-full rounded-xl bg-slate-50 object-contain"
        />
        {images.length > 1 && (
          <div className="mt-4 flex justify-between gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => move(-1)}
              aria-label="Ảnh trước"
            >
              ← Trước
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => move(1)}
              aria-label="Ảnh tiếp theo"
            >
              Tiếp →
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
