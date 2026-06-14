"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";

type Theme = "light" | "dark";
const themeChangeEvent = "autobot-theme-change";

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("autobot-theme", nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className={`theme-toggle ${className}`}
    >
      <SunIcon className={`size-4 transition ${theme === "light" ? "scale-100 opacity-100" : "absolute scale-75 opacity-0"}`} />
      <MoonIcon className={`size-4 transition ${theme === "dark" ? "scale-100 opacity-100" : "absolute scale-75 opacity-0"}`} />
    </button>
  );
}
