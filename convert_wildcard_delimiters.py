#!/usr/bin/env python3
"""
Convert wildcard delimiters from __ to @@ in all wildcard files.
This prevents conflicts with LoRA tags that contain __ in their names.
"""
import re
from pathlib import Path

WILDCARDS_DIR = Path("extensions/sd-dynamic-prompts/wildcards")

def convert_wildcard_delimiters(dry_run=True):
    """
    Replace __wildcard__ with @@wildcard@@ in all wildcard files.
    Only replaces when __ appears as wildcard delimiters, not in LoRA tags.
    Uses a two-pass approach to protect LoRA tags.
    """
    files_modified = 0
    total_replacements = 0

    # Pattern to match <lora:...> tags (to protect them)
    lora_pattern = re.compile(r'<lora:[^>]+>')
    # Pattern to match __wildcard__ references (non-greedy to avoid matching across multiple wildcards)
    wildcard_pattern = re.compile(r'__(.+?)__')

    for txt_file in WILDCARDS_DIR.rglob("*.txt"):
        try:
            content = txt_file.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            try:
                content = txt_file.read_text(encoding='latin-1')
            except Exception as e:
                print(f"ERROR reading {txt_file}: {e}")
                continue
        except Exception as e:
            print(f"ERROR reading {txt_file}: {e}")
            continue

        # Step 1: Temporarily replace LoRA tags with placeholders
        lora_tags = []
        def save_lora(match):
            lora_tags.append(match.group(0))
            return f"<<<LORA_{len(lora_tags)-1}>>>"

        protected_content = lora_pattern.sub(save_lora, content)

        # Step 2: Replace __wildcard__ with @@wildcard@@ (now safe from LoRA tags)
        wildcard_matches = wildcard_pattern.findall(protected_content)
        if not wildcard_matches and len(lora_tags) == 0:
            continue

        new_content = wildcard_pattern.sub(r'@@\1@@', protected_content)
        replacements_in_file = len(wildcard_matches)

        # Step 3: Restore LoRA tags
        for i, lora_tag in enumerate(lora_tags):
            new_content = new_content.replace(f"<<<LORA_{i}>>>", lora_tag)

        if replacements_in_file == 0:
            continue

        if dry_run:
            print(f"WOULD UPDATE: {txt_file.relative_to(WILDCARDS_DIR)} ({replacements_in_file} wildcards)")
            for match in wildcard_matches[:5]:  # Show first 5
                print(f"  __{match}__ -> @@{match}@@")
            if len(wildcard_matches) > 5:
                print(f"  ... and {len(wildcard_matches) - 5} more")
            files_modified += 1
            total_replacements += replacements_in_file
        else:
            try:
                txt_file.write_text(new_content, encoding='utf-8')
                print(f"UPDATED: {txt_file.relative_to(WILDCARDS_DIR)} ({replacements_in_file} wildcards)")
                files_modified += 1
                total_replacements += replacements_in_file
            except Exception as e:
                print(f"ERROR writing {txt_file}: {e}")

    print(f"\n{'=' * 60}")
    if dry_run:
        print(f"DRY RUN: Would modify {files_modified} files")
        print(f"Total wildcard delimiters to replace: {total_replacements}")
    else:
        print(f"COMPLETE: Modified {files_modified} files")
        print(f"Total wildcard delimiters replaced: {total_replacements}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    import sys

    print("Wildcard Delimiter Converter")
    print("=" * 60)
    print("This will convert __wildcard__ to @@wildcard@@")
    print("LoRA tags with __ will remain unchanged")
    print("=" * 60)

    execute = '--execute' in sys.argv

    if execute:
        print("\nEXECUTING CONVERSION:\n")
        convert_wildcard_delimiters(dry_run=False)
    else:
        print("\nDRY RUN (showing what would change):\n")
        convert_wildcard_delimiters(dry_run=True)
        print("\nTo actually convert files, run: python convert_wildcard_delimiters.py --execute")
