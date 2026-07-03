#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Systematically rename wildcard files to replace underscores with hyphens.
This prevents conflicts with sd-dynamic-prompts' __wildcard__ syntax.
"""
import os
from pathlib import Path

# Base directory for wildcards, anchored to the repo root (tools/..) so the
# script works from any working directory
WILDCARDS_DIR = Path(__file__).resolve().parent.parent / "extensions/sd-dynamic-prompts/wildcards"

def safe_print(text):
    """Print text with ASCII encoding fallback for Windows console."""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', errors='replace').decode('ascii'))

def rename_wildcard_files(dry_run=True):
    """
    Rename all .txt files containing underscores to use hyphens instead.

    Args:
        dry_run: If True, only print what would be renamed without actually renaming
    """
    renamed_count = 0
    skipped_count = 0
    total_files = 0

    # Find all .txt files with underscores
    for txt_file in WILDCARDS_DIR.rglob("*_*.txt"):
        total_files += 1
        # Get the new filename by replacing underscores with hyphens
        old_name = txt_file.name
        new_name = old_name.replace('_', '-')

        # Skip if already using hyphens
        if old_name == new_name:
            continue

        new_path = txt_file.parent / new_name

        # Check if target already exists
        if new_path.exists():
            safe_print(f"SKIP (target exists): {txt_file.relative_to(WILDCARDS_DIR)} -> {new_name}")
            skipped_count += 1
            continue

        if dry_run:
            safe_print(f"WOULD RENAME: {txt_file.relative_to(WILDCARDS_DIR)} -> {new_name}")
            renamed_count += 1
        else:
            try:
                txt_file.rename(new_path)
                safe_print(f"RENAMED: {txt_file.relative_to(WILDCARDS_DIR)} -> {new_name}")
                renamed_count += 1
            except Exception as e:
                safe_print(f"ERROR: {txt_file.relative_to(WILDCARDS_DIR)}: {e}")
                skipped_count += 1

    print(f"\n{'=' * 60}")
    print(f"Total files checked: {total_files}")
    if dry_run:
        print(f"DRY RUN COMPLETE: {renamed_count} files would be renamed, {skipped_count} skipped")
        print("Run with dry_run=False to actually rename files")
    else:
        print(f"RENAMING COMPLETE: {renamed_count} files renamed, {skipped_count} skipped")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    import sys

    print("Wildcard File Renaming Tool")
    print("=" * 60)
    print("This will rename all wildcard files to replace _ with -")
    print("Example: Lora_Large.txt -> Lora-Large.txt")
    print("=" * 60)

    # Check for --execute flag
    execute = '--execute' in sys.argv

    if execute:
        print("\nEXECUTING RENAMING (--execute flag provided):\n")
        rename_wildcard_files(dry_run=False)
    else:
        print("\nDRY RUN (showing what would change):\n")
        rename_wildcard_files(dry_run=True)
        print("\nTo actually rename files, run: python rename_wildcards.py --execute")
