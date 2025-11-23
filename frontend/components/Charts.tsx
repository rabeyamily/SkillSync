"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SkillTagProps {
  name: string;
  category: string;
  type?: "matched" | "missing" | "extra";
  matchType?: string;
  confidence?: number;
}

export function SkillTag({
  name,
  category,
  type = "matched",
  matchType,
  confidence,
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

interface CategoryBreakdownChartProps {
  breakdown: Record<string, Record<string, number>>;
}

export function CategoryBreakdownChart({
  breakdown,
}: CategoryBreakdownChartProps) {
  const categories = Object.entries(breakdown).map(([category, counts]) => ({
    name: category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    matched: counts.matched || 0,
    missing: counts.missing || 0,
    extra: counts.extra || 0,
  }));

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Category Breakdown Chart
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={categories}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={120}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="matched" fill="#10b981" name="Matched" />
          <Bar dataKey="missing" fill="#ef4444" name="Missing" />
          <Bar dataKey="extra" fill="#3b82f6" name="Extra" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ScoreDistributionChartProps {
  technicalScore: number;
  softSkillsScore: number;
  educationScore?: number;
  certificationScore?: number;
}

export function ScoreDistributionChart({
  technicalScore,
  softSkillsScore,
  educationScore,
  certificationScore,
}: ScoreDistributionChartProps) {
  const data = [
    { name: "Technical", score: technicalScore },
    { name: "Soft Skills", score: softSkillsScore },
    ...(educationScore !== undefined
      ? [{ name: "Education", score: educationScore }]
      : []),
    ...(certificationScore !== undefined
      ? [{ name: "Certifications", score: certificationScore }]
      : []),
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Score Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="score" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SkillMatchPieChartProps {
  matched: number;
  missing: number;
  total: number;
}

export function SkillMatchPieChart({
  matched,
  missing,
  total,
}: SkillMatchPieChartProps) {
  const data = [
    { name: "Matched", value: matched, color: "#10b981" },
    { name: "Missing", value: missing, color: "#ef4444" },
  ];

  const COLORS = data.map((d) => d.color);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Skill Match Overview
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => {
              const { name, value, percent } = props;
              return `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MatchTypeDistributionChartProps {
  matches: Array<{ match_type: string }>;
}

export function MatchTypeDistributionChart({
  matches,
}: MatchTypeDistributionChartProps) {
  const typeCounts = matches.reduce(
    (acc, match) => {
      acc[match.match_type] = (acc[match.match_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = Object.entries(typeCounts).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }));

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Match Type Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => {
              const { name, value, percent } = props;
              return `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

