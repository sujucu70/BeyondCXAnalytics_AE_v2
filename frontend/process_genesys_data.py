#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genesys Data Processing Script
Step 1: Data Cleaning
Step 2: Skill Grouping (Fuzzy Matching)
Step 3: Validation Report
Step 4: Export Clean Data & Mappings
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import numpy as np
from difflib import SequenceMatcher
import unicodedata
import re
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

def normalize_text(text):
    """Normalize text: lowercase, remove extra spaces, normalize accents"""
    if pd.isna(text):
        return ""

    text = str(text).strip()
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    # Lowercase
    text = text.lower()
    # Normalize unicode (remove accents)
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')

    return text

def correct_common_typos(text):
    """Fix common typos and variations"""
    if not text:
        return text

    replacements = {
        'telefonico': 'telefonico',
        'telefónico': 'telefonico',
        'teléfonico': 'telefonico',
        'cobros': 'cobros',
        'cobro': 'cobros',
        'facturacion': 'facturacion',
        'facturación': 'facturacion',
        'información': 'informacion',
        'informacion': 'informacion',
        'consulta': 'consulta',
        'consultas': 'consulta',
        'soporte': 'soporte',
        'soportes': 'soporte',
        'contrato': 'contrato',
        'contratos': 'contrato',
        'averia': 'averia',
        'averias': 'averia',
        'automatizacion': 'automatizacion',
        'automatización': 'automatizacion',
        'reclamo': 'reclamo',
        'reclamos': 'reclamo',
        'gestion': 'gestion',
        'gestión': 'gestion',
    }

    for typo, correction in replacements.items():
        if typo in text:
            text = text.replace(typo, correction)

    return text

def similarity_ratio(a, b):
    """Calculate similarity between two strings (0-1)"""
    return SequenceMatcher(None, a, b).ratio()

def group_similar_skills(skills, threshold=0.85):
    """Group similar skills using fuzzy matching"""
    unique_skills = sorted(list(set(skills)))
    skill_mapping = {}
    grouped_skills = {}
    used = set()

    for i, skill1 in enumerate(unique_skills):
        if skill1 in used:
            continue

        group = [skill1]
        used.add(skill1)

        # Find similar skills
        for j, skill2 in enumerate(unique_skills):
            if i != j and skill2 not in used:
                ratio = similarity_ratio(skill1, skill2)
                if ratio >= threshold:
                    group.append(skill2)
                    used.add(skill2)

        # Use the first (alphabetically shortest) as canonical
        canonical = min(group, key=lambda x: (len(x), x))
        grouped_skills[canonical] = sorted(group)

        for skill in group:
            skill_mapping[skill] = canonical

    return skill_mapping, grouped_skills

def main():
    print("="*80)
    print("GENESYS DATA PROCESSING - 4 STEPS")
    print("="*80)

    # ===== STEP 1: DATA CLEANING =====
    print("\n[STEP 1] DATA CLEANING...")
    print("-" * 80)

    # Read Excel file
    try:
        df = pd.read_excel('data.xlsx')
        print(f"[OK] Loaded data.xlsx: {len(df)} records")
    except Exception as e:
        print(f"[ERROR] Error reading file: {e}")
        return

    print(f"  Columns: {list(df.columns)}")
    initial_records = len(df)

    # Store original data for comparison
    df_original = df.copy()

    # Normalize text columns
    text_columns = df.select_dtypes(include=['object']).columns
    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].apply(normalize_text)
            df[col] = df[col].apply(correct_common_typos)

    print(f"[OK] Normalized all text columns: {len(text_columns)} columns")

    # Remove duplicates
    duplicates_before = len(df)
    df = df.drop_duplicates()
    duplicates_removed = duplicates_before - len(df)
    print(f"[OK] Removed duplicates: {duplicates_removed} duplicate rows removed")

    cleaned_records = len(df)

    # ===== STEP 2: SKILL GROUPING =====
    print("\n[STEP 2] SKILL GROUPING (Fuzzy Matching)...")
    print("-" * 80)

    # Identify skill column (likely 'queue_skill', 'skill', 'skills', etc.)
    skill_column = None
    for col in ['queue_skill', 'skill', 'skills', 'queue', 'category', 'type']:
        if col in df.columns:
            skill_column = col
            break

    if not skill_column:
        # Find the column with most string values and use that
        for col in text_columns:
            if df[col].nunique() < len(df) * 0.5:
                skill_column = col
                break

    if skill_column:
        unique_skills_before = df[skill_column].nunique()
        print(f"[OK] Identified skill column: '{skill_column}'")
        print(f"  Unique skills BEFORE grouping: {unique_skills_before}")

        # Group similar skills
        skill_mapping, grouped_skills = group_similar_skills(
            df[skill_column].unique().tolist(),
            threshold=0.80
        )

        # Apply mapping
        df[skill_column] = df[skill_column].map(skill_mapping)

        unique_skills_after = df[skill_column].nunique()
        skills_grouped = unique_skills_before - unique_skills_after

        print(f"[OK] Unique skills AFTER grouping: {unique_skills_after}")
        print(f"  Skills grouped: {skills_grouped}")
        print(f"  Reduction: {(skills_grouped/unique_skills_before)*100:.1f}%")
    else:
        print("[WARN] Warning: Could not identify skill column")
        skill_mapping = {}
        grouped_skills = {}
        unique_skills_before = 0
        unique_skills_after = 0

    # ===== STEP 3: VALIDATION REPORT =====
    print("\n[STEP 3] GENERATING VALIDATION REPORT...")
    print("-" * 80)

    report_lines = []
    report_lines.append("="*80)
    report_lines.append("GENESYS DATA CLEANING REPORT")
    report_lines.append("="*80)
    report_lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    report_lines.append("DATA QUALITY METRICS")
    report_lines.append("-" * 80)
    report_lines.append(f"Records before cleaning:    {initial_records}")
    report_lines.append(f"Records after cleaning:     {cleaned_records}")
    report_lines.append(f"Duplicate records removed:  {duplicates_removed}")
    report_lines.append(f"Record reduction:           {(duplicates_removed/initial_records)*100:.2f}%")

    report_lines.append(f"\nSKILL CONSOLIDATION")
    report_lines.append("-" * 80)
    report_lines.append(f"Unique skills before:       {unique_skills_before}")
    report_lines.append(f"Unique skills after:        {unique_skills_after}")
    report_lines.append(f"Skills grouped:             {skills_grouped}")
    report_lines.append(f"Consolidation rate:         {(skills_grouped/unique_skills_before)*100:.2f}%")

    report_lines.append(f"\nCLEANING OPERATIONS")
    report_lines.append("-" * 80)
    report_lines.append(f"[OK] Text normalization:       {len(text_columns)} columns normalized")
    report_lines.append(f"[OK] Typo correction:          Applied to all text fields")
    report_lines.append(f"[OK] Duplicate removal:        {duplicates_removed} rows removed")
    report_lines.append(f"[OK] Skill grouping:           {len(skill_mapping)} original skills consolidated")

    if skill_column:
        report_lines.append(f"\nSKILL MAPPING (Top 20)")
        report_lines.append("-" * 80)

        # Show some examples of mappings
        mapping_examples = {}
        for orig, canonical in sorted(skill_mapping.items())[:20]:
            if orig != canonical:
                if canonical not in mapping_examples:
                    mapping_examples[canonical] = []
                mapping_examples[canonical].append(orig)

        for canonical, originals in sorted(mapping_examples.items()):
            if len(originals) > 1:
                report_lines.append(f"\n'{canonical}' (consolidated from {len(originals)} variants)")
                for orig in sorted(originals)[:5]:
                    report_lines.append(f"  → {orig}")
                if len(originals) > 5:
                    report_lines.append(f"  ... and {len(originals)-5} more")

    report_lines.append(f"\nFILE OUTPUT SUMMARY")
    report_lines.append("-" * 80)
    report_lines.append(f"[OK] datos-limpios.xlsx:       {cleaned_records} cleaned records")
    report_lines.append(f"[OK] skills-mapping.xlsx:      Skill consolidation mapping")
    report_lines.append(f"[OK] informe-limpieza.txt:     This report")

    report_lines.append(f"\nEND OF REPORT")
    report_lines.append("="*80)

    report_text = "\n".join(report_lines)
    print(report_text)

    # ===== STEP 4: EXPORT =====
    print("\n[STEP 4] EXPORTING DATA & REPORTS...")
    print("-" * 80)

    # Export cleaned data
    try:
        df.to_excel('datos-limpios.xlsx', index=False)
        print("[OK] Exported: datos-limpios.xlsx")
    except Exception as e:
        print(f"[ERROR] Error exporting cleaned data: {e}")

    # Export skill mapping
    try:
        if skill_mapping:
            mapping_df = pd.DataFrame([
                {'Original Skill': orig, 'Canonical Skill': canonical, 'Group Size': len(grouped_skills.get(canonical, []))}
                for orig, canonical in sorted(skill_mapping.items())
            ])
            mapping_df.to_excel('skills-mapping.xlsx', index=False)
            print("[OK] Exported: skills-mapping.xlsx")
        else:
            print("[WARN] No skill mapping to export")
    except Exception as e:
        print(f"[ERROR] Error exporting skill mapping: {e}")

    # Export report
    try:
        with open('informe-limpieza.txt', 'w', encoding='utf-8') as f:
            f.write(report_text)
        print("[OK] Exported: informe-limpieza.txt")
    except Exception as e:
        print(f"[ERROR] Error exporting report: {e}")

    print("\n" + "="*80)
    print("PROCESSING COMPLETE!")
    print("="*80)
    print(f"\nSummary:")
    print(f"  • Records: {initial_records} → {cleaned_records} (-{duplicates_removed})")
    print(f"  • Skills: {unique_skills_before} → {unique_skills_after} (-{skills_grouped})")
    print(f"  • All files saved to current directory")

if __name__ == "__main__":
    main()
