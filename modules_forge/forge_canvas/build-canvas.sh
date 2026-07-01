#!/bin/bash
# Build script - Bundles all modules into canvas.js for browser

echo "Building canvas.js from modules..."

OUTPUT="canvas.js"
MODULES_DIR="modules"

# Start with header
cat > "$OUTPUT" << 'EOF'
/**
 * ForgeCanvas - Bundled from modular source
 *
 * Source modules located in: modules_forge/forge_canvas/modules/
 * To modify, edit the individual module files and run: ./build-canvas.sh
 */

EOF

# Add modules in dependency order
# gradio-sync.js FIRST (contains GradioTextAreaBind used by others)
echo "Adding gradio-sync.js..."
grep -v "^import" "$MODULES_DIR/gradio-sync.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding canvas-state.js..."
sed 's/^export //' "$MODULES_DIR/canvas-state.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding shapes-library.js..."
sed 's/^export //' "$MODULES_DIR/shapes-library.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding shapes-renderer.js..."
grep -v "^import" "$MODULES_DIR/shapes-renderer.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding drawing-engine.js..."
grep -v "^import" "$MODULES_DIR/drawing-engine.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding history-manager.js..."
grep -v "^import" "$MODULES_DIR/history-manager.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding cursor-manager.js..."
grep -v "^import" "$MODULES_DIR/cursor-manager.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding image-manager.js..."
grep -v "^import" "$MODULES_DIR/image-manager.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "Adding ui-manager.js..."
grep -v "^import" "$MODULES_DIR/ui-manager.js" | sed 's/^export //' >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Add main ForgeCanvas class (without imports)
echo "Adding main ForgeCanvas class..."
grep -v "^import" "canvas-refactored.js" | sed 's/^export //' >> "$OUTPUT"

# Add Python-style boolean compatibility
echo "" >> "$OUTPUT"
echo "const True = true;" >> "$OUTPUT"
echo "const False = false;" >> "$OUTPUT"

echo "✅ Build complete: $OUTPUT"
echo "Total lines: $(wc -l < "$OUTPUT")"
