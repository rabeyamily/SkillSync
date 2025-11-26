/**
 * Utility functions for exporting report data
 */

import { SkillGapReport } from "@/utils/types";

/**
 * Convert report data to CSV format
 */
export function exportToCSV(report: SkillGapReport): string {
  const rows: string[] = [];

  // Header
  rows.push("SkillSync - Skill Gap Analysis Report");
  rows.push(`Generated: ${new Date(report.generated_at).toLocaleString()}`);
  rows.push("");

  // Executive Summary
  rows.push("Executive Summary");
  rows.push(`Overall Fit Score,${report.fit_score.overall_score.toFixed(2)}%`);
  rows.push(`Matched Skills,${report.fit_score.matched_count}`);
  rows.push(`Missing Skills,${report.fit_score.missing_count}`);
  rows.push(`Total Job Description Skills,${report.fit_score.total_jd_skills}`);
  rows.push("");

  // Fit Score Breakdown
  rows.push("Fit Score Breakdown");
  rows.push("Category,Score (%),Weight");
  rows.push(
    `Technical Skills,${report.fit_score.technical_score.toFixed(2)},${(report.fit_score.technical_weight * 100).toFixed(0)}%`
  );
  rows.push(
    `Soft Skills,${report.fit_score.soft_skills_score.toFixed(2)},${(report.fit_score.soft_skills_weight * 100).toFixed(0)}%`
  );
  if (report.fit_score.education_score !== undefined) {
    rows.push(`Education,${report.fit_score.education_score.toFixed(2)},N/A`);
  }
  if (report.fit_score.certification_score !== undefined) {
    rows.push(`Certifications,${report.fit_score.certification_score.toFixed(2)},N/A`);
  }
  rows.push("");

  // Matched Skills
  rows.push("Matched Skills");
  rows.push("Skill Name,Category,Match Type");
  report.gap_analysis.matched_skills.forEach((match) => {
    rows.push(
      `"${match.skill.name}","${match.skill.category}","${match.match_type}"`
    );
  });
  rows.push("");

  // Missing Skills
  rows.push("Missing Skills");
  rows.push("Skill Name,Category");
  report.gap_analysis.missing_skills.forEach((skill) => {
    rows.push(`"${skill.name}","${skill.category}"`);
  });
  rows.push("");

  // Extra Skills
  rows.push("Extra Skills");
  rows.push("Skill Name,Category");
  report.gap_analysis.extra_skills.forEach((skill) => {
    rows.push(`"${skill.name}","${skill.category}"`);
  });
  rows.push("");

  // Category Breakdown
  rows.push("Category Breakdown");
  rows.push("Category,Matched,Missing,Extra");
  Object.entries(report.gap_analysis.category_breakdown).forEach(
    ([category, counts]) => {
      rows.push(
        `"${category.replace(/_/g, " ")}",${counts.matched || 0},${counts.missing || 0},${counts.extra || 0}`
      );
    }
  );
  rows.push("");

  // Recommendations
  rows.push("Recommendations");
  report.recommendations.forEach((rec, index) => {
    rows.push(`${index + 1}.,"${rec.replace(/"/g, '""')}"`);
  });

  return rows.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = "skill_gap_report.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download PDF from blob
 */
export function downloadPDF(blob: Blob, filename: string = "skill_gap_report.pdf") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

