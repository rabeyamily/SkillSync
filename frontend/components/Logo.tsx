import React from "react";
import Image from "next/image";

export default function Logo({ className = "", showCat = true }: { className?: string; showCat?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCat && (
        <Image
          src="/skillsync-logo.png"
          alt="SkillSync Logo"
          width={48}
          height={48}
          className="flex-shrink-0"
          unoptimized
          priority
        />
      )}
      <span className="relative inline-block">
        {/* Skill - same font as Sync */}
        <span 
          className="text-gray-800 dark:text-gray-200 font-bold text-2xl sm:text-3xl"
          style={{
            fontFamily: "var(--font-lora), 'Lora', serif",
            fontWeight: 700,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          Skill
        </span>
        {/* Sync - bold dark gray */}
        <span 
          className="text-gray-800 dark:text-gray-200 font-bold text-2xl sm:text-3xl"
          style={{
            fontFamily: "var(--font-lora), 'Lora', serif",
            fontWeight: 700,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          Sync
        </span>
      </span>
    </div>
  );
}

