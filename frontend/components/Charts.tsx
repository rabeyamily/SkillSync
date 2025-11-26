"use client";

interface SkillTagProps {
  name: string;
  category: string;
  type?: "matched" | "missing" | "extra";
  matchType?: string;
}

export function SkillTag({
  name,
  category,
  type = "matched",
  matchType,
}: SkillTagProps) {
  const getTypeColor = () => {
    const baseColor = "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-600/30";
    switch (type) {
      case "matched":
        return baseColor;
      case "missing":
        return "bg-gray-100 text-gray-700 border-red-400 dark:bg-gray-800/30 dark:text-gray-300 dark:border-red-600/50";
      case "extra":
        return baseColor;
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${getTypeColor()} m-1`}
    >
      <span>{name}</span>
    </div>
  );
}

