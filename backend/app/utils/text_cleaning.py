"""
Text cleaning and normalization utilities.
"""
import re
from typing import Optional


def clean_text(text: str) -> str:
    """
    Clean and normalize extracted text.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Normalize whitespace - replace multiple spaces/tabs/newlines with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Remove excessive line breaks
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove special characters that might interfere (keep alphanumeric, punctuation, and common symbols)
    # Keep: letters, numbers, spaces, and common punctuation
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\'\"\/\\\@\#\$\%\&\*\=\+\<\>]', '', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text


def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace in text.
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text
    """
    if not text:
        return ""
    
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)
    
    # Normalize line breaks
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\r', '\n', text)
    
    # Remove excessive line breaks
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def extract_sections(text: str) -> dict:
    """
    Attempt to extract structured sections from text.
    
    Args:
        text: Text to extract sections from
        
    Returns:
        Dictionary with section names as keys and content as values
    """
    sections = {
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "certifications": "",
        "other": ""
    }
    
    # Common section headers
    section_patterns = {
        "summary": r'(?:summary|objective|profile|about)\s*:?\s*\n',
        "experience": r'(?:experience|work\s+experience|employment|professional\s+experience)\s*:?\s*\n',
        "education": r'(?:education|academic|qualifications)\s*:?\s*\n',
        "skills": r'(?:skills|technical\s+skills|competencies)\s*:?\s*\n',
        "certifications": r'(?:certifications|certificates|credentials)\s*:?\s*\n',
    }
    
    text_lower = text.lower()
    
    # Find section boundaries
    section_starts = {}
    for section, pattern in section_patterns.items():
        matches = list(re.finditer(pattern, text_lower, re.IGNORECASE | re.MULTILINE))
        if matches:
            section_starts[section] = matches[0].start()
    
    # Sort sections by position
    sorted_sections = sorted(section_starts.items(), key=lambda x: x[1])
    
    # Extract content between sections
    if sorted_sections:
        for i, (section, start) in enumerate(sorted_sections):
            end = sorted_sections[i + 1][1] if i + 1 < len(sorted_sections) else len(text)
            sections[section] = text[start:end].strip()
    else:
        # If no clear sections found, put everything in "other"
        sections["other"] = text
    
    return sections


def remove_encoding_issues(text: str) -> str:
    """
    Remove or fix encoding issues in text.
    
    Args:
        text: Text that may have encoding issues
        
    Returns:
        Text with encoding issues fixed
    """
    if not text:
        return ""
    
    # Replace common encoding errors
    replacements = {
        '\u2018': "'",  # Left single quotation mark
        '\u2019': "'",  # Right single quotation mark
        '\u201C': '"',  # Left double quotation mark
        '\u201D': '"',  # Right double quotation mark
        '\u2013': '-',  # En dash
        '\u2014': '--',  # Em dash
        '\u2026': '...',  # Horizontal ellipsis
        '\u00A0': ' ',  # Non-breaking space
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text

