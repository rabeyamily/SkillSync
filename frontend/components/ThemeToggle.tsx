"use client";

import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isAnimating, setIsAnimating] = useState(false);
  const [wasDark, setWasDark] = useState(isDark);

  const handleToggle = () => {
    setWasDark(isDark);
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => {
      setIsAnimating(false);
      // Force a reflow to ensure smooth transition
      requestAnimationFrame(() => {
        // Animation state is now synced with theme state
      });
    }, 400);
  };

  useEffect(() => {
    if (!isAnimating) {
      setWasDark(isDark);
    }
  }, [isDark, isAnimating]);

  return (
    <button
      onClick={handleToggle}
      className="relative inline-flex h-4 w-7 items-center rounded-full border border-blue-600 dark:border-blue-400 bg-gray-100 dark:bg-gray-800 transition-colors focus:outline-none p-0.5 overflow-hidden hover:border-black dark:hover:border-black"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'black';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDark ? '#00a0dc' : '#0077b5';
      }}
    >
      {/* LinkedIn blue background that follows the ball */}
      <span
        className="absolute left-0.5 top-0.5 bottom-0.5 rounded-full z-0"
        style={{
          backgroundColor: '#0077b5',
          ...(isAnimating
            ? {
                animation: wasDark ? "linkedInFillReverse 0.4s linear forwards" : "linkedInFill 0.4s linear forwards",
                animationFillMode: "forwards",
              }
            : {
                width: isDark ? "calc(100% - 0.5rem)" : "0%",
              })
        }}
      ></span>

      {/* Toggle thumb */}
      <span
        className="absolute top-1/2 h-2.5 w-2.5 rounded-full border z-10"
        style={
          isAnimating
            ? {
                animation: wasDark 
                  ? "rollReverse 0.4s linear forwards, ballFromLinkedIn 0.4s linear forwards" 
                  : "roll 0.4s linear forwards, ballToLinkedIn 0.4s linear forwards",
                left: wasDark ? "calc(100% - 0.625rem - 0.125rem)" : "0.125rem",
                transform: "translateY(-50%)",
                animationFillMode: "forwards",
                willChange: "transform",
              }
            : {
                left: isDark ? "calc(100% - 0.625rem - 0.125rem)" : "0.125rem",
                transform: "translateY(-50%)",
                backgroundColor: isDark ? "#00a0dc" : "#0077b5",
                borderColor: "#0077b5",
                willChange: "auto",
                animation: "none",
              }
        }
      >
        {/* Sun/Moon icon inside thumb - half dark, half light */}
        <span className="flex items-center justify-center h-full w-full relative overflow-hidden rounded-full">
          {/* Left half (dark) */}
          <span
            className="absolute left-0 top-0 bottom-0 w-1/2"
            style={{
              backgroundColor: isDark ? "#00a0dc" : "#0077b5",
              transition: "background-color 0.4s linear",
            }}
          ></span>
          {/* Right half (light) */}
          <span
            className="absolute right-0 top-0 bottom-0 w-1/2"
            style={{
              backgroundColor: isDark ? "#00a0dc" : "#0077b5",
              transition: "background-color 0.4s linear",
            }}
          ></span>
        </span>
      </span>
    </button>
  );
}

