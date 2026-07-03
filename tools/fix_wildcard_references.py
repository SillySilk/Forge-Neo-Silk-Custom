#!/usr/bin/env python3
"""
Fix wildcard references inside wildcard files.
Replace single underscores with hyphens inside __wildcard__ patterns.
"""
import re
from pathlib import Path

# Anchored to the repo root (tools/..) so the script works from any working directory
WILDCARDS_DIR = Path(__file__).resolve().parent.parent / "extensions/sd-dynamic-prompts/wildcards"

def replace_underscores_in_wildcards(match):
    """Replace single underscores with hyphens inside __wildcard__ match."""
    content = match.group(1)  # Get the content between __ __
    return f"__{content.replace('_', '-')}__"

def fix_wildcard_references(dry_run=True):
    """
    Find all __wildcard__ patterns and replace underscores inside with hyphens.
    Keeps the double underscores __ as wildcard delimiters.
    """
    files_modified = 0
    total_replacements = 0

    # Pattern to match __anything__ (non-greedy)
    pattern = re.compile(r'__(.+?)__')

    for txt_file in WILDCARDS_DIR.rglob("*.txt"):
        try:
            content = txt_file.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            # Try with latin-1 encoding as fallback
            try:
                content = txt_file.read_text(encoding='latin-1')
            except Exception as e:
                print(f"ERROR reading {txt_file}: {e}")
                continue
        except Exception as e:
            print(f"ERROR reading {txt_file}: {e}")
            continue

        # Count how many underscores will be replaced
        matches = pattern.findall(content)
        replacements_in_file = sum(match.count('_') for match in matches)

        if replacements_in_file == 0:
            continue

        # Replace underscores with hyphens inside __wildcard__ references
        new_content = pattern.sub(replace_underscores_in_wildcards, content)

        if dry_run:
            print(f"WOULD UPDATE: {txt_file.relative_to(WILDCARDS_DIR)} ({replacements_in_file} underscores)")
            files_modified += 1
            total_replacements += replacements_in_file
        else:
            try:
                txt_file.write_text(new_content, encoding='utf-8')
                print(f"UPDATED: {txt_file.relative_to(WILDCARDS_DIR)} ({replacements_in_file} underscores)")
                files_modified += 1
                total_replacements += replacements_in_file
            except Exception as e:
                print(f"ERROR writing {txt_file}: {e}")

    print(f"\n{'=' * 60}")
    if dry_run:
        print(f"DRY RUN: Would modify {files_modified} files")
        print(f"Total underscores to replace: {total_replacements}")
    else:
        print(f"COMPLETE: Modified {files_modified} files")
        print(f"Total underscores replaced: {total_replacements}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    import sys

    print("Wildcard Reference Fixer")
    print("=" * 60)
    print("This will replace __wildcard_name__ with __wildcard-name__")
    print("=" * 60)

    execute = '--execute' in sys.argv

    if execute:
        print("\nEXECUTING REPLACEMENTS:\n")
        fix_wildcard_references(dry_run=False)
    else:
        print("\nDRY RUN (showing what would change):\n")
        fix_wildcard_references(dry_run=True)
        print("\nTo actually fix files, run: python fix_wildcard_references.py --execute")
