"use client";

import { useEffect } from "react";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function ScrollMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const heroImage = document.querySelector<HTMLElement>(".motion-hero-image");
    const heroCopy = document.querySelector<HTMLElement>(".motion-hero-copy");
    const parallaxImages = Array.from(
      document.querySelectorAll<HTMLElement>(".parallax-image"),
    );
    const storyCards = Array.from(
      document.querySelectorAll<HTMLElement>(".motion-story-card"),
    );
    const heroFloats = Array.from(
      document.querySelectorAll<HTMLElement>(".motion-hero-float"),
    );
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(".motion-reveal, .motion-showcase"),
    );
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    function resetMotion() {
      document.documentElement.style.removeProperty("--page-progress");
      heroImage?.style.removeProperty("transform");
      heroCopy?.style.removeProperty("transform");
      parallaxImages.forEach((image) => image.style.removeProperty("transform"));
      storyCards.forEach((card) => card.style.removeProperty("transform"));
      heroFloats.forEach((element) => element.style.removeProperty("--scroll-shift"));
    }

    function updateMotion() {
      if (reducedMotion.matches) {
        resetMotion();
        frame = 0;
        return;
      }

      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollRange =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pageProgress = scrollRange > 0 ? clamp(scrollTop / scrollRange, 0, 1) : 0;

      document.documentElement.style.setProperty(
        "--page-progress",
        pageProgress.toString(),
      );

      if (heroImage && scrollTop <= viewportHeight * 1.15) {
        heroImage.style.transform = `translate3d(0, ${scrollTop * 0.16}px, 0) scale(1.1)`;
      }

      if (heroCopy && scrollTop <= viewportHeight) {
        heroCopy.style.transform = `translate3d(0, ${scrollTop * 0.07}px, 0)`;
      }

      heroFloats.forEach((element) => {
        const speed = Number(element.dataset.motionSpeed ?? 0.15);
        const direction = Number(element.dataset.motionDirection ?? 1);
        element.style.setProperty(
          "--scroll-shift",
          `${scrollTop * speed * direction}px`,
        );
      });

      parallaxImages.forEach((image) => {
        const frameElement = image.closest<HTMLElement>(".parallax-frame");
        if (!frameElement) return;

        const bounds = frameElement.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > viewportHeight) return;

        const frameCenter = bounds.top + bounds.height / 2;
        const viewportCenter = viewportHeight / 2;
        const progress = clamp(
          (viewportCenter - frameCenter) / (viewportHeight + bounds.height),
          -1,
          1,
        );

        image.style.transform = `translate3d(0, ${progress * 112}px, 0) scale(1.22)`;
      });

      storyCards.forEach((card) => {
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > viewportHeight) return;

        const cardCenter = bounds.top + bounds.height / 2;
        const viewportCenter = viewportHeight / 2;
        const progress = clamp(
          (viewportCenter - cardCenter) / (viewportHeight + bounds.height),
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
