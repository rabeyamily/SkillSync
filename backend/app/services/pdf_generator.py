"""
PDF Report Generation Service using ReportLab.
"""
from io import BytesIO
from typing import Optional
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
    ListFlowable,
    ListItem,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas

from app.models.schemas import SkillGapReport, FitScoreBreakdown, GapAnalysis


class PDFReportGenerator:
    """Generate PDF reports from skill gap analysis data."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style - Times New Roman
        if "CustomTitle" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="CustomTitle",
                    parent=self.styles["Heading1"],
                    fontSize=24,
                    textColor=colors.HexColor("#1e40af"),
                    spaceAfter=30,
                    alignment=TA_CENTER,
                    fontName="Times-Roman",
                )
            )

        # Section header style - Times New Roman
        if "SectionHeader" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="SectionHeader",
                    parent=self.styles["Heading2"],
                    fontSize=16,
                    textColor=colors.HexColor("#1e40af"),
                    spaceAfter=12,
                    spaceBefore=20,
                    fontName="Times-Roman",
                )
            )

        # Subsection header style - Times New Roman
        if "SubsectionHeader" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="SubsectionHeader",
                    parent=self.styles["Heading3"],
                    fontSize=14,
                    textColor=colors.HexColor("#475569"),
                    spaceAfter=8,
                    spaceBefore=12,
                    fontName="Times-Roman",
                )
            )

        # Custom body text style - Times New Roman
        if "ReportBodyText" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="ReportBodyText",
                    parent=self.styles["Normal"],
                    fontSize=11,
                    spaceAfter=12,
                    alignment=TA_JUSTIFY,
                    fontName="Times-Roman",
                )
            )

        # Score style - Times New Roman
        if "ScoreText" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="ScoreText",
                    parent=self.styles["Normal"],
                    fontSize=32,
                    textColor=colors.HexColor("#059669"),
                    alignment=TA_CENTER,
                    fontName="Times-Bold",
                )
            )

    def generate_pdf(self, report: SkillGapReport) -> BytesIO:
        """
        Generate PDF report from SkillGapReport.
        
        Args:
            report: SkillGapReport object
            
        Returns:
            BytesIO buffer containing PDF data
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Header
        story.extend(self._create_header(report))

        # Executive Summary
        story.extend(self._create_executive_summary(report))

        # Skill Breakdown Section
        story.extend(self._create_skill_breakdown_section(report.gap_analysis))

        # Course Recommendations Section
        course_recs = report.course_recommendations if report.course_recommendations is not None else []
        story.extend(self._create_course_recommendations_section(course_recs))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _create_header(self, report: SkillGapReport) -> list:
        """Create report header."""
        elements = []

        # Title
        title = Paragraph("Skill Gap Analysis Report", self.styles["CustomTitle"])
        elements.append(title)
        elements.append(Spacer(1, 0.2 * inch))

        # Date - Times New Roman
        date_str = report.generated_at.strftime("%B %d, %Y at %I:%M %p")
        date_style = ParagraphStyle(
            name="DateStyle",
            parent=self.styles["Normal"],
            fontSize=11,
            fontName="Times-Roman",
        )
        date_para = Paragraph(f"Generated: {date_str}", date_style)
        elements.append(date_para)
        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_executive_summary(self, report: SkillGapReport) -> list:
        """Create executive summary section."""
        elements = []

        # Section header
        header = Paragraph("Executive Summary", self.styles["SectionHeader"])
        elements.append(header)

        # Overall score
        overall_score = report.fit_score.overall_score
        score_text = f"<b>Overall Fit Score: {overall_score:.1f}%</b>"
        score_para = Paragraph(score_text, self.styles["ReportBodyText"])
        elements.append(score_para)
        elements.append(Spacer(1, 0.1 * inch))

        # Summary text (removed the "This comprehensive report..." line)
        summary_text = f"""
        You have achieved a <b>{overall_score:.1f}%</b> overall fit score, with <b>{report.fit_score.matched_count}</b> matched skills,
        <b>{report.fit_score.missing_count}</b> missing skills, and <b>{len(report.gap_analysis.extra_skills)}</b> extra skills.
        """
        summary_para = Paragraph(summary_text, self.styles["ReportBodyText"])
        elements.append(summary_para)
        elements.append(Spacer(1, 0.1 * inch))

        # Score interpretation
        if overall_score >= 80:
            interpretation = "Excellent match! Your skills align very well with the job requirements."
        elif overall_score >= 60:
            interpretation = "Good match! You have a solid foundation with room for improvement."
        elif overall_score >= 40:
            interpretation = "Moderate match. Focus on developing the missing skills identified below."
        else:
            # Remove the interpretation for low scores
            interpretation = None

        if interpretation:
            interpretation_para = Paragraph(f"<i>{interpretation}</i>", self.styles["ReportBodyText"])
            elements.append(interpretation_para)
            elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _create_fit_score_section(self, fit_score: FitScoreBreakdown) -> list:
        """Create fit score breakdown section."""
        elements = []

        header = Paragraph("Fit Score Breakdown", self.styles["SectionHeader"])
        elements.append(header)

        # Score table
        score_data = [
            ["Category", "Score (%)", "Weight"],
            [
                "Technical Skills",
                f"{fit_score.technical_score:.1f}%",
                f"{fit_score.technical_weight * 100:.0f}%",
            ],
            [
                "Soft Skills",
                f"{fit_score.soft_skills_score:.1f}%",
                f"{fit_score.soft_skills_weight * 100:.0f}%",
            ],
        ]

        if fit_score.education_score is not None:
            score_data.append(
                ["Education", f"{fit_score.education_score:.1f}%", "N/A"]
            )

        if fit_score.certification_score is not None:
            score_data.append(
                ["Certifications", f"{fit_score.certification_score:.1f}%", "N/A"]
            )

        score_table = Table(score_data, colWidths=[3 * inch, 1.5 * inch, 1.5 * inch])
        score_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                ]
            )
        )
        elements.append(score_table)
        elements.append(Spacer(1, 0.2 * inch))

        # Statistics
        stats_data = [
            ["Metric", "Count"],
            ["Matched Skills", str(fit_score.matched_count)],
            ["Missing Skills", str(fit_score.missing_count)],
            ["Total JD Skills", str(fit_score.total_jd_skills)],
        ]

        stats_table = Table(stats_data, colWidths=[3 * inch, 3 * inch])
        stats_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(stats_table)
        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_skill_breakdown_section(self, gap_analysis: GapAnalysis) -> list:
        """Create skill breakdown section."""
        elements = []

        header = Paragraph("Skill Breakdown", self.styles["SectionHeader"])
        elements.append(header)

        # Matched Skills
        if gap_analysis.matched_skills:
            matched_header = Paragraph(
                "Matched Skills", self.styles["SubsectionHeader"]
            )
            elements.append(matched_header)

            matched_text = f"""
            You have <b>{len(gap_analysis.matched_skills)}</b> skills that match the job requirements.
            """
            matched_intro = Paragraph(matched_text, self.styles["ReportBodyText"])
            elements.append(matched_intro)
            elements.append(Spacer(1, 0.1 * inch))

            # Create skill boxes (like in website) instead of bullet list
            matched_skill_names = [match.skill.name for match in gap_analysis.matched_skills[:50]]
            matched_boxes = self._create_skill_boxes(matched_skill_names)
            elements.extend(matched_boxes)

            if len(gap_analysis.matched_skills) > 50:
                remaining = len(gap_analysis.matched_skills) - 50
                elements.append(
                    Paragraph(
                        f"... and {remaining} additional matched skills.",
                        self.styles["ReportBodyText"],
                    )
                )
            elements.append(Spacer(1, 0.15 * inch))

        # Missing Skills
        if gap_analysis.missing_skills:
            missing_header = Paragraph(
                "Missing Skills", self.styles["SubsectionHeader"]
            )
            elements.append(missing_header)

            missing_text = f"""
            The following <b>{len(gap_analysis.missing_skills)}</b> skills are required or preferred for this position 
            but were not found in your resume:
            """
            missing_intro = Paragraph(missing_text, self.styles["ReportBodyText"])
            elements.append(missing_intro)
            elements.append(Spacer(1, 0.1 * inch))

            # Create skill boxes (like in website) instead of bullet list
            missing_skill_names = [skill.name for skill in gap_analysis.missing_skills[:50]]
            missing_boxes = self._create_skill_boxes(missing_skill_names)
            elements.extend(missing_boxes)

            if len(gap_analysis.missing_skills) > 50:
                remaining = len(gap_analysis.missing_skills) - 50
                elements.append(
                    Paragraph(
                        f"... and {remaining} additional missing skills.",
                        self.styles["ReportBodyText"],
                    )
                )
            elements.append(Spacer(1, 0.15 * inch))

        # Extra Skills
        if gap_analysis.extra_skills:
            extra_header = Paragraph("Extra Skills", self.styles["SubsectionHeader"])
            elements.append(extra_header)

            extra_text = f"""
            You have <b>{len(gap_analysis.extra_skills)}</b> skills in your resume that are not explicitly mentioned 
            in the job description. These can be valuable differentiators:
            """
            extra_intro = Paragraph(extra_text, self.styles["ReportBodyText"])
            elements.append(extra_intro)
            elements.append(Spacer(1, 0.1 * inch))

            # Create skill boxes (like in website) instead of bullet list
            extra_skill_names = [skill.name for skill in gap_analysis.extra_skills[:50]]
            extra_boxes = self._create_skill_boxes(extra_skill_names)
            elements.extend(extra_boxes)

            if len(gap_analysis.extra_skills) > 50:
                remaining = len(gap_analysis.extra_skills) - 50
                elements.append(
                    Paragraph(
                        f"... and {remaining} additional skills you can highlight.",
                        self.styles["ReportBodyText"],
                    )
                )
            elements.append(Spacer(1, 0.15 * inch))

        return elements

    def _create_course_recommendations_section(self, course_recommendations: list) -> list:
        """Create course recommendations section similar to homepage display."""
        elements = []

        header = Paragraph("Recommended Courses", self.styles["SectionHeader"])
        elements.append(header)

        # Description
        desc_text = "Coursera courses tailored to your missing skills."
        desc_para = Paragraph(desc_text, self.styles["ReportBodyText"])
        elements.append(desc_para)
        elements.append(Spacer(1, 0.15 * inch))

        if not course_recommendations:
            no_recs = Paragraph(
                "No course recommendations available at this time.",
                self.styles["ReportBodyText"],
            )
            elements.append(no_recs)
        else:
            # Create a table with course recommendations
            # Each row will have: Skill Name | Category | Platform | Link
            course_data = [["Skill", "Category", "Platform", "Link"]]
            
            for rec in course_recommendations:
                skill_name = rec.get("skill_name", "N/A")
                category = rec.get("category", "other").replace("_", " ").title()
                platform = rec.get("platform", "Coursera")
                link = rec.get("course_url", "")
                
                # Truncate link for display (show first 50 chars)
                link_display = link[:50] + "..." if len(link) > 50 else link
                
                course_data.append([skill_name, category, platform, link_display])
            
            # Create table (adjust column widths to fit page)
            # Page width: 8.5 inch, margins: 1 inch each side = 6.5 inch usable
            col_widths = [2.2 * inch, 1.3 * inch, 1.3 * inch, 1.7 * inch]
            course_table = Table(course_data, colWidths=col_widths)
            course_table.setStyle(
                TableStyle([
                    # Header row
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("TOPPADDING", (0, 0), (-1, 0), 10),
                    # Data rows
                    ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 1), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
                ])
            )
            elements.append(course_table)
            elements.append(Spacer(1, 0.2 * inch))
            
            # Note about links
            note_text = "<i>Note: Click on the links above to access the recommended courses on Coursera.</i>"
            note_para = Paragraph(note_text, self.styles["ReportBodyText"])
            elements.append(note_para)
            elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_skill_boxes(self, skill_names: list[str]) -> list:
        """Create skill boxes similar to website display."""
        elements = []

        # Create boxes in a grid layout (3 columns)
        box_width = 1.8 * inch
        box_height = 0.4 * inch
        boxes_per_row = 3
        spacing = 0.15 * inch
        
        # Group skills into rows
        skill_rows = []
        for i in range(0, len(skill_names), boxes_per_row):
            skill_rows.append(skill_names[i:i + boxes_per_row])
        
        # Create table for skill boxes
        box_data = []
        for row in skill_rows:
            box_row = []
            for skill_name in row:
                # Create a box with border and padding
                skill_box = Table(
                    [[Paragraph(skill_name, ParagraphStyle(
                        name="SkillBoxText",
                        parent=self.styles["Normal"],
                        fontSize=9,
                        fontName="Times-Roman",
                        alignment=TA_CENTER,
                    ))]],
                    colWidths=[box_width],
                    rowHeights=[box_height]
                )
                skill_box.setStyle(
                    TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#374151")),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ])
                )
                box_row.append(skill_box)
            # Pad row if needed
            while len(box_row) < boxes_per_row:
                box_row.append(Spacer(box_width, box_height))
            box_data.append(box_row)
        
        # Create table with skill boxes
        skill_table = Table(
            box_data,
            colWidths=[box_width] * boxes_per_row,
            rowHeights=[box_height + spacing] * len(box_data)
        )
        skill_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        elements.append(skill_table)
        elements.append(Spacer(1, 0.1 * inch))

        return elements

    def _create_action_items_section(self, report: SkillGapReport) -> list:
        """Create actionable items section."""
        elements = []

        header = Paragraph("Action Items", self.styles["SectionHeader"])
        elements.append(header)

        action_items = []

        # Based on missing skills
        if report.gap_analysis.missing_skills:
            top_missing = report.gap_analysis.missing_skills[:5]
            missing_names = ", ".join([skill.name for skill in top_missing])
            action_items.append(
                f"<b>Priority:</b> Focus on learning these top missing skills: {missing_names}"
            )

        # Based on fit score
        overall_score = report.fit_score.overall_score
        if overall_score < 60:
            action_items.append(
                "<b>Immediate:</b> Consider taking online courses or getting certifications "
                "to strengthen your profile in the required skill areas."
            )
        elif overall_score < 80:
            action_items.append(
                "<b>Enhancement:</b> Work on the missing skills identified above to improve "
                "your overall fit score."
            )

        # Based on match quality
        matched_skills = report.gap_analysis.matched_skills
        fuzzy_matches = [m for m in matched_skills if m.match_type == "fuzzy"]
        if len(fuzzy_matches) > len(matched_skills) * 0.3:
            action_items.append(
                "<b>Resume Optimization:</b> Update your resume to use the exact terminology "
                "from the job description to improve keyword matching."
            )

        # Based on extra skills
        if report.gap_analysis.extra_skills:
            action_items.append(
                "<b>Highlight:</b> Emphasize your additional skills in your cover letter "
                "and interviews to differentiate yourself from other candidates."
            )

        if not action_items:
            action_items.append(
                "Review the recommendations above and focus on areas where you can improve "
                "your skill alignment."
            )

        item_paragraphs = [
            Paragraph(item, self.styles["ReportBodyText"]) for item in action_items
        ]
        item_list = ListFlowable(
            item_paragraphs,
            bulletType="1",
            start="1",
            bulletFontName="Helvetica-Bold",
            leftIndent=18,
        )
        elements.append(item_list)

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _build_bullet_list(
        self, items: list[str], bullet_char: str = "•", left_indent: int = 12
    ) -> ListFlowable:
        """Helper to build a bullet list from strings."""
        bullet_style = self.styles["ReportBodyText"]
        flowables = [
            ListItem(
                Paragraph(item, bullet_style),
                leftIndent=left_indent,
                bulletFontName="Helvetica-Bold",
            )
            for item in items
        ]
        return ListFlowable(
            flowables,
            bulletType="bullet",
            bulletFontName="Helvetica-Bold",
            bulletChar=bullet_char,
            leftIndent=left_indent,
        )


# Global PDF generator instance
pdf_report_generator = PDFReportGenerator()

