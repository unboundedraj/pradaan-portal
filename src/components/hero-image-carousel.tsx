"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDES = [
  { src: "/hero/crying-infant.jpg", alt: "Black-and-white portrait of a crying infant" },
  { src: "/hero/child-hunger.jpg", alt: "Black-and-white portrait of a child looking upward" },
  { src: "/hero/elderly-and-child.jpg", alt: "Black-and-white portrait of an elderly woman with a child" },
  { src: "/hero/pediatric-patient.jpg", alt: "Portrait of a child in a hospital bed" },
  { src: "/hero/child-labor.jpg", alt: "Portrait of a child at manual work" },
];

/** Rotates through the hero portraits every 5s, matching the original Pradaan carousel's cadence. */
export function HeroImageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-104 w-96 overflow-hidden rounded-l-full border-4 border-[var(--brand-lime)]">
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          sizes="384px"
          className={`object-cover transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          priority={i === 0}
        />
      ))}
    </div>
  );
}
