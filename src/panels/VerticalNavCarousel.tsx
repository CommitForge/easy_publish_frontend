import type { ReactNode } from "react";
import "./VerticalNavCarousel.css";

interface VerticalNavCarouselProps {
  children: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
}

export default function VerticalNavCarousel({
  children,
  onPrev,
  onNext,
  prevLabel = "Previous",
  nextLabel = "Next",
}: VerticalNavCarouselProps) {
  return (
    <div className="vertical-nav-carousel">
      <button
        type="button"
        className="vertical-nav-carousel-edge vertical-nav-carousel-edge--left"
        onClick={onPrev}
        aria-label={prevLabel}
      >
        <span className="vertical-nav-carousel-edge-arrow">◀</span>
      </button>

      <div className="vertical-nav-carousel-content">{children}</div>

      <button
        type="button"
        className="vertical-nav-carousel-edge vertical-nav-carousel-edge--right"
        onClick={onNext}
        aria-label={nextLabel}
      >
        <span className="vertical-nav-carousel-edge-arrow">▶</span>
      </button>
    </div>
  );
}
