#!/usr/bin/env python3
"""
Fix LoRA metadata to replace double underscores with single underscores
This updates the ss_output_name field inside the safetensors file
"""

import os
import json
import safetensors.torch

def fix_lora_metadata(lora_path):
    """Fix double underscores in LoRA metadata"""
    print(f"\nProcessing: {lora_path}")

    # Load the safetensors file
    with safetensors.torch.safe_open(lora_path, framework="pt") as f:
        metadata = f.metadata()
        tensors = {key: f.get_tensor(key) for key in f.keys()}

    # Check if ss_output_name exists and has double underscores
    if metadata and 'ss_output_name' in metadata:
        old_name = metadata['ss_output_name']
        if '__' in old_name:
            new_name = old_name.replace('__', '_')
            print(f"  Old name: {old_name}")
            print(f"  New name: {new_name}")

            # Update metadata
            metadata['ss_output_name'] = new_name

            # Save back to file
            safetensors.torch.save_file(tensors, lora_path, metadata=metadata)
            print("  ✓ Metadata updated successfully!")
            return True
        else:
            print("  - No double underscores found in metadata")
    else:
        print("  - No ss_output_name metadata found")

    return False

def main():
    lora_path = r"C:\AI\Forge_neo\forge-neo\models\Lora\Characters\Characters_toon\Cassie_EvansV2.safetensors"

    if not os.path.exists(lora_path):
        print(f"Error: File not found: {lora_path}")
        return

    fix_lora_metadata(lora_path)
    print("\nDone! Restart Forge to see the changes.")

if __name__ == "__main__":
    main()
