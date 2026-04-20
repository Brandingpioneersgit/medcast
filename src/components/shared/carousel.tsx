"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps {
  children: ReactNode[];
  cardsPerView?: { mobile: number; tablet: number; desktop: number };
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showIndicators?: boolean;
  showArrows?: boolean;
  className?: string;
}

export function Carousel({
  children,
  cardsPerView = { mobile: 1, tablet: 2, desktop: 4 },
  autoPlay = false,
  autoPlayInterval = 4000,
  showIndicators = true,
  showArrows = true,
  className = "",
}: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [perView, setPerView] = useState(cardsPerView.mobile);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    function updatePerView() {
      if (window.innerWidth >= 1024) setPerView(cardsPerView.desktop);
      else if (window.innerWidth >= 768) setPerView(cardsPerView.tablet);
      else setPerView(cardsPerView.mobile);
    }
    updatePerView();
    window.addEventListener("resize", updatePerView);
    return () => window.removeEventListener("resize", updatePerView);
  }, [cardsPerView]);

  const totalSlides = Math.ceil(children.length / perView);

  useEffect(() => {
    if (currentSlide >= totalSlides) setCurrentSlide(Math.max(0, totalSlides - 1));
  }, [totalSlides, currentSlide]);

  useEffect(() => {
    if (!autoPlay || isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(s => (s + 1) % totalSlides);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, isPaused, totalSlides]);

  const prev = useCallback(() => setCurrentSlide(s => Math.max(0, s - 1)), []);
  const next = useCallback(() => setCurrentSlide(s => Math.min(totalSlides - 1, s + 1)), [totalSlides]);

  if (children.length === 0) return null;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Arrows */}
      {showArrows && totalSlides > 1 && (
        <div className="absolute -top-2 right-0 flex space-x-2 z-10 hidden md:flex">
          <button
            onClick={prev}
            disabled={currentSlide === 0}
            className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            onClick={next}
            disabled={currentSlide >= totalSlides - 1}
            className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      )}

      {/* Mobile arrows */}
      {showArrows && totalSlides > 1 && (
        <div className="flex justify-between items-center mb-4 md:hidden">
          <span className="text-sm text-gray-500">{currentSlide + 1} / {totalSlides}</span>
          <div className="flex space-x-2">
            <button onClick={prev} disabled={currentSlide === 0} className="bg-white rounded-full p-2 shadow-md border border-gray-200 disabled:opacity-50">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <button onClick={next} disabled={currentSlide >= totalSlides - 1} className="bg-white rounded-full p-2 shadow-md border border-gray-200 disabled:opacity-50">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Slider */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {/* Group children into slides */}
          {Array.from({ length: totalSlides }).map((_, slideIdx) => (
            <div
              key={slideIdx}
              className="w-full flex-shrink-0"
              style={{ minWidth: "100%" }}
            >
              <div className={`grid gap-6 grid-cols-${perView}`} style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}>
                {children.slice(slideIdx * perView, slideIdx * perView + perView)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicators */}
      {showIndicators && totalSlides > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === currentSlide ? "bg-green-600 scale-110" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
