"use client";

import { useEffect } from "react";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function ScrollMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const parallaxImages = Array.from(
      document.querySelectorAll<HTMLElement>(".parallax-image"),
    );
    const storyCards = Array.from(
      document.querySelectorAll<HTMLElement>(".motion-story-card"),
    );
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(".motion-reveal, .motion-showcase"),
    );
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    function resetMotion() {
      parallaxImages.forEach((image) => image.style.removeProperty("transform"));
      storyCards.forEach((card) => card.style.removeProperty("transform"));
    }

    function updateMotion() {
      if (reducedMotion.matches) {
        resetMotion();
        frame = 0;
        return;
      }

      const viewportHeight = window.innerHeight;

      parallaxImages.forEach((image) => {
        const frameElement = image.closest<HTMLElement>(".parallax-frame");
        if (!frameElement) return;

        const bounds = frameElement.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > viewportHeight) return;

        const progress = clamp(
          (viewportHeight / 2 - (bounds.top + bounds.height / 2)) /
            (viewportHeight + bounds.height),
          -1,
          1,
        );

        image.style.transform = `translate3d(0, ${progress * 112}px, 0) scale(1.22)`;
      });

      storyCards.forEach((card) => {
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > viewportHeight) return;

        const progress = clamp(
          (viewportHeight / 2 - (bounds.top + bounds.height / 2)) /
            (viewportHeight + bounds.height),
          -1,
          1,
        );
        const direction = Number(card.dataset.motionDirection ?? 1);

        card.style.transform = `translate3d(${progress * direction * 14}px, ${progress * -28}px, 0) rotate(${progress * direction * 0.75}deg)`;
      });

      frame = 0;
    }

    function scheduleUpdate() {
      if (!frame) {
        frame = window.requestAnimationFrame(updateMotion);
      }
    }

    document.documentElement.classList.add("motion-ready");
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    revealElements.forEach((element) => observer?.observe(element));

    updateMotion();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    reducedMotion.addEventListener("change", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotion.removeEventListener("change", scheduleUpdate);
      observer?.disconnect();
      document.documentElement.classList.remove("motion-ready");
      if (frame) window.cancelAnimationFrame(frame);
      resetMotion();
    };
  }, []);

  return null;
}
