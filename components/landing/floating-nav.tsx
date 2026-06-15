"use client";

import { useEffect, useState } from "react";

import { AutobotLogo } from "@/components/brand/autobot-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function FloatingNav() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    let frame = 0;

    function updateNav() {
      setIsCompact(window.scrollY > 48);
      frame = 0;
    }

    function onScroll() {
      if (!frame) {
        frame = window.requestAnimationFrame(updateNav);
      }
    }

    updateNav();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="landing-nav">
      <nav
        aria-label="Main navigation"
        className={`landing-nav-inner ${isCompact ? "is-compact" : ""}`}
      >
        <AutobotLogo />
        <div className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
          <a className="transition-colors hover:text-forest" href="#story">
            What it does
          </a>
          <a className="transition-colors hover:text-forest" href="#command-center">
            Daily view
          </a>
          <a className="transition-colors hover:text-forest" href="#security">
            Security
          </a>
        </div>
        <ThemeToggle />
      </nav>
    </header>
  );
}
