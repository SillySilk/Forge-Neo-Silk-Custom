/**
 * ForgeCanvas Shapes Library
 *
 * This file contains all shape definitions for the ForgeCanvas drawing tool.
 * Shapes are defined in a normalized 100x100 coordinate system.
 *
 * Path format: array of {type, x, y} objects where:
 *   - type: "M" (move), "L" (line), "C" (cubic bezier), "Q" (quadratic), "Z" (close)
 *   - coordinates in 100x100 space
 *
 * To add new shapes: Simply add new objects to the ForgeCanvasShapes array below.
 * No need to modify canvas.js!
 */

const ForgeCanvasShapes = [
    {
        name: "gradient_circle",
        displayName: "◉ Gradient Circle",
        category: "mask",
        path: "gradient_circle"
    },
    {
        name: "rounded_rectangle",
        displayName: "▢ Rounded Rectangle",
        category: "mask",
        path: [
            {type: "M", x: 15, y: 0},
            {type: "L", x: 85, y: 0},
            {type: "Q", cpx: 100, cpy: 0,  x: 100, y: 15},
            {type: "L", x: 100, y: 85},
            {type: "Q", cpx: 100, cpy: 100, x: 85, y: 100},
            {type: "L", x: 15, y: 100},
            {type: "Q", cpx: 0, cpy: 100, x: 0, y: 85},
            {type: "L", x: 0, y: 15},
            {type: "Q", cpx: 0, cpy: 0, x: 15, y: 0},
            {type: "Z"}
        ]
    },
    {
        name: "starburst",
        displayName: "✴ Starburst",
        category: "comic",
        path: [
            {type: "M", x: 50, y: 10},
            {type: "L", x: 55, y: 40},
            {type: "L", x: 82, y: 18},
            {type: "L", x: 60, y: 45},
            {type: "L", x: 90, y: 50},
            {type: "L", x: 60, y: 55},
            {type: "L", x: 82, y: 82},
            {type: "L", x: 55, y: 60},
            {type: "L", x: 50, y: 90},
            {type: "L", x: 45, y: 60},
            {type: "L", x: 18, y: 82},
            {type: "L", x: 40, y: 55},
            {type: "L", x: 10, y: 50},
            {type: "L", x: 40, y: 45},
            {type: "L", x: 18, y: 18},
            {type: "L", x: 45, y: 40},
            {type: "Z"}
        ]
    },
    {
        name: "impact_lines",
        displayName: "💥 Impact Lines",
        category: "comic",
        path: [
            {type: "M", x: 50, y: 20},
            {type: "L", x: 52, y: 45},
            {type: "L", x: 50, y: 45},
            {type: "L", x: 48, y: 45},
            {type: "Z"},
            {type: "M", x: 70, y: 30},
            {type: "L", x: 57, y: 48},
            {type: "L", x: 56, y: 46},
            {type: "L", x: 55, y: 44},
            {type: "Z"},
            {type: "M", x: 80, y: 50},
            {type: "L", x: 55, y: 52},
            {type: "L", x: 55, y: 50},
            {type: "L", x: 55, y: 48},
            {type: "Z"},
            {type: "M", x: 70, y: 70},
            {type: "L", x: 57, y: 52},
            {type: "L", x: 56, y: 54},
            {type: "L", x: 55, y: 56},
            {type: "Z"},
            {type: "M", x: 50, y: 80},
            {type: "L", x: 52, y: 55},
            {type: "L", x: 50, y: 55},
            {type: "L", x: 48, y: 55},
            {type: "Z"},
            {type: "M", x: 30, y: 70},
            {type: "L", x: 43, y: 52},
            {type: "L", x: 44, y: 54},
            {type: "L", x: 45, y: 56},
            {type: "Z"},
            {type: "M", x: 20, y: 50},
            {type: "L", x: 45, y: 52},
            {type: "L", x: 45, y: 50},
            {type: "L", x: 45, y: 48},
            {type: "Z"},
            {type: "M", x: 30, y: 30},
            {type: "L", x: 43, y: 48},
            {type: "L", x: 44, y: 46},
            {type: "L", x: 45, y: 44},
            {type: "Z"}
        ]
    },
    {
        name: "speed_lines",
        displayName: "➤ Speed Lines",
        category: "comic",
        path: [
            {type: "M", x: 10, y: 25},
            {type: "L", x: 60, y: 23},
            {type: "L", x: 60, y: 27},
            {type: "L", x: 10, y: 29},
            {type: "Z"},
            {type: "M", x: 20, y: 40},
            {type: "L", x: 75, y: 38},
            {type: "L", x: 75, y: 42},
            {type: "L", x: 20, y: 44},
            {type: "Z"},
            {type: "M", x: 15, y: 55},
            {type: "L", x: 70, y: 53},
            {type: "L", x: 70, y: 57},
            {type: "L", x: 15, y: 59},
            {type: "Z"},
            {type: "M", x: 25, y: 70},
            {type: "L", x: 80, y: 68},
            {type: "L", x: 80, y: 72},
            {type: "L", x: 25, y: 74},
            {type: "Z"}
        ]
    },
    {
        name: "action_swoosh",
        displayName: "⚡ Action Swoosh",
        category: "comic",
        path: [
            {type: "M", x: 10, y: 40},
            {type: "L", x: 30, y: 30},
            {type: "L", x: 50, y: 25},
            {type: "L", x: 70, y: 22},
            {type: "L", x: 85, y: 20},
            {type: "L", x: 90, y: 25},
            {type: "L", x: 75, y: 28},
            {type: "L", x: 55, y: 32},
            {type: "L", x: 35, y: 38},
            {type: "L", x: 15, y: 50},
            {type: "Z"}
        ]
    },
    // Emotion & Expression Shapes
    {
        name: "question_mark",
        displayName: "❓ Question Mark",
        category: "emotion",
        path: [
            {type: "M", x: 35, y: 30},
            {type: "Q", cpx: 35, cpy: 20, x: 45, y: 18},
            {type: "Q", cpx: 55, cpy: 16, x: 60, y: 22},
            {type: "Q", cpx: 65, cpy: 30, x: 60, y: 38},
            {type: "Q", cpx: 55, cpy: 45, x: 50, y: 50},
            {type: "L", x: 50, y: 58},
            {type: "L", x: 45, y: 58},
            {type: "L", x: 45, y: 48},
            {type: "Q", cpx: 50, cpy: 42, x: 55, y: 36},
            {type: "Q", cpx: 58, cpy: 30, x: 55, y: 25},
            {type: "Q", cpx: 52, cpy: 22, x: 45, y: 23},
            {type: "Q", cpx: 40, cpy: 24, x: 38, y: 28},
            {type: "Z"},
            {type: "M", x: 45, y: 68}, {type: "L", x: 45, y: 75}, {type: "L", x: 50, y: 75}, {type: "L", x: 50, y: 68}, {type: "Z"}
        ]
    },
    {
        name: "exclamation",
        displayName: "❗ Exclamation",
        category: "emotion",
        path: [
            {type: "M", x: 45, y: 20}, {type: "L", x: 55, y: 20}, {type: "L", x: 52, y: 60}, {type: "L", x: 48, y: 60}, {type: "Z"},
            {type: "M", x: 45, y: 70}, {type: "L", x: 55, y: 70}, {type: "L", x: 55, y: 80}, {type: "L", x: 45, y: 80}, {type: "Z"}
        ]
    },
    {
        name: "zzz",
        displayName: "😴 Zzz Sleep",
        category: "emotion",
        path: [
            {type: "M", x: 25, y: 60}, {type: "L", x: 40, y: 60}, {type: "L", x: 25, y: 70}, {type: "L", x: 40, y: 70}, {type: "Z"},
            {type: "M", x: 45, y: 45}, {type: "L", x: 60, y: 45}, {type: "L", x: 45, y: 55}, {type: "L", x: 60, y: 55}, {type: "Z"},
            {type: "M", x: 60, y: 25}, {type: "L", x: 75, y: 25}, {type: "L", x: 60, y: 35}, {type: "L", x: 75, y: 35}, {type: "Z"}
        ]
    },
    {
        name: "music_note",
        displayName: "🎵 Music Note",
        category: "emotion",
        path: [
            {type: "M", x: 40, y: 20}, {type: "L", x: 45, y: 20}, {type: "L", x: 45, y: 60},
            {type: "E", cx: 40, cy: 65, rx: 8, ry: 12, rotation: 0},
            {type: "M", x: 60, y: 30}, {type: "L", x: 65, y: 30}, {type: "L", x: 65, y: 70},
            {type: "E", cx: 60, cy: 75, rx: 8, ry: 12, rotation: 0},
            {type: "M", x: 45, y: 25}, {type: "L", x: 65, y: 30}, {type: "L", x: 65, y: 35}, {type: "L", x: 45, y: 30}, {type: "Z"}
        ]
    },
    // More Impact & Emphasis
    {
        name: "pow",
        displayName: "👊 POW Star",
        category: "impact",
        path: [
            {type: "M", x: 50, y: 15}, {type: "L", x: 60, y: 40}, {type: "L", x: 85, y: 40},
            {type: "L", x: 65, y: 55}, {type: "L", x: 75, y: 80}, {type: "L", x: 50, y: 65},
            {type: "L", x: 25, y: 80}, {type: "L", x: 35, y: 55}, {type: "L", x: 15, y: 40},
            {type: "L", x: 40, y: 40}, {type: "Z"}
        ]
    },
    {
        name: "sparkle",
        displayName: "✨ Sparkle",
        category: "impact",
        path: [
            {type: "M", x: 50, y: 20}, {type: "L", x: 52, y: 48}, {type: "L", x: 80, y: 50},
            {type: "L", x: 52, y: 52}, {type: "L", x: 50, y: 80}, {type: "L", x: 48, y: 52},
            {type: "L", x: 20, y: 50}, {type: "L", x: 48, y: 48}, {type: "Z"}
        ]
    },
    {
        name: "boom_cloud",
        displayName: "💥 Boom Cloud",
        category: "impact",
        path: [
            {type: "M", x: 25, y: 50},
            {type: "Q", cpx: 20, cpy: 40, x: 28, y: 35},
            {type: "Q", cpx: 35, cpy: 25, x: 45, y: 28},
            {type: "Q", cpx: 50, cpy: 20, x: 55, y: 28},
            {type: "Q", cpx: 65, cpy: 25, x: 72, y: 35},
            {type: "Q", cpx: 80, cpy: 40, x: 75, y: 50},
            {type: "Q", cpx: 80, cpy: 60, x: 72, y: 65},
            {type: "Q", cpx: 65, cpy: 75, x: 55, y: 72},
            {type: "Q", cpx: 50, cpy: 80, x: 45, y: 72},
            {type: "Q", cpx: 35, cpy: 75, x: 28, y: 65},
            {type: "Q", cpx: 20, cpy: 60, x: 25, y: 50},
            {type: "Z"}
        ]
    },
    // More Emotions & Symbols
    {
        name: "skull",
        displayName: "💀 Skull",
        category: "emotion",
        path: [
            {type: "M", x: 50, y: 20},
            {type: "Q", cpx: 30, cpy: 22, x: 25, y: 35},
            {type: "Q", cpx: 22, cpy: 50, x: 30, y: 60},
            {type: "L", x: 35, y: 70}, {type: "L", x: 45, y: 70}, {type: "L", x: 45, y: 80},
            {type: "L", x: 55, y: 80}, {type: "L", x: 55, y: 70}, {type: "L", x: 65, y: 70},
            {type: "L", x: 70, y: 60},
            {type: "Q", cpx: 78, cpy: 50, x: 75, y: 35},
            {type: "Q", cpx: 70, cpy: 22, x: 50, y: 20},
            {type: "Z"},
            {type: "E", cx: 38, cy: 42, rx: 5, ry: 8},
            {type: "E", cx: 62, cy: 42, rx: 5, ry: 8},
            {type: "M", x: 45, y: 58}, {type: "L", x: 48, y: 55}, {type: "L", x: 52, y: 55},
            {type: "L", x: 55, y: 58}, {type: "L", x: 52, y: 61}, {type: "L", x: 48, y: 61}, {type: "Z"}
        ]
    },
    {
        name: "fire",
        displayName: "🔥 Fire",
        category: "emotion",
        path: [
            {type: "M", x: 50, y: 20},
            {type: "Q", cpx: 60, cpy: 25, x: 65, y: 35},
            {type: "Q", cpx: 70, cpy: 50, x: 65, y: 65},
            {type: "Q", cpx: 60, cpy: 80, x: 50, y: 85},
            {type: "Q", cpx: 40, cpy: 80, x: 35, y: 65},
            {type: "Q", cpx: 30, cpy: 50, x: 35, y: 35},
            {type: "Q", cpx: 40, cpy: 25, x: 50, y: 20},
            {type: "Z"},
            {type: "M", x: 50, y: 40},
            {type: "Q", cpx: 55, cpy: 45, x: 56, y: 52},
            {type: "Q", cpx: 55, cpy: 62, x: 50, y: 68},
            {type: "Q", cpx: 45, cpy: 62, x: 44, y: 52},
            {type: "Q", cpx: 45, cpy: 45, x: 50, y: 40},
            {type: "Z"}
        ]
    },
    {
        name: "impact_lines_splayed",
        displayName: "💥 Splayed Impact",
        category: "impact",
        path: [
            // Wide splayed impact lines from center
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 10}, {type: "L", x: 53, y: 10}, {type: "L", x: 51, y: 50}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 80, y: 20}, {type: "L", x: 82, y: 22}, {type: "L", x: 52, y: 51}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 92, y: 48}, {type: "L", x: 92, y: 51}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 80, y: 80}, {type: "L", x: 82, y: 82}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 90}, {type: "L", x: 53, y: 90}, {type: "L", x: 51, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 20, y: 80}, {type: "L", x: 18, y: 82}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 8, y: 48}, {type: "L", x: 8, y: 51}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 20, y: 20}, {type: "L", x: 18, y: 22}, {type: "L", x: 48, y: 51}, {type: "Z"}
        ]
    },
    {
        name: "impact_star_burst",
        displayName: "💥⭐ Star Impact",
        category: "impact",
        path: [
            // Splayed lines with stars
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 15}, {type: "L", x: 52, y: 15}, {type: "L", x: 51, y: 50}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 78, y: 25}, {type: "L", x: 80, y: 27}, {type: "L", x: 52, y: 51}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 85, y: 50}, {type: "L", x: 85, y: 52}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 78, y: 75}, {type: "L", x: 80, y: 77}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 22, y: 75}, {type: "L", x: 20, y: 77}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 15, y: 50}, {type: "L", x: 15, y: 52}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 22, y: 25}, {type: "L", x: 20, y: 27}, {type: "L", x: 48, y: 51}, {type: "Z"},
            // Small stars
            {type: "M", x: 50, y: 8}, {type: "L", x: 51, y: 11}, {type: "L", x: 54, y: 11}, {type: "L", x: 52, y: 13}, {type: "L", x: 53, y: 16}, {type: "L", x: 50, y: 14}, {type: "L", x: 47, y: 16}, {type: "L", x: 48, y: 13}, {type: "L", x: 46, y: 11}, {type: "L", x: 49, y: 11}, {type: "Z"},
            {type: "M", x: 85, y: 20}, {type: "L", x: 86, y: 23}, {type: "L", x: 89, y: 23}, {type: "L", x: 87, y: 25}, {type: "L", x: 88, y: 28}, {type: "L", x: 85, y: 26}, {type: "L", x: 82, y: 28}, {type: "L", x: 83, y: 25}, {type: "L", x: 81, y: 23}, {type: "L", x: 84, y: 23}, {type: "Z"},
            {type: "M", x: 15, y: 20}, {type: "L", x: 16, y: 23}, {type: "L", x: 19, y: 23}, {type: "L", x: 17, y: 25}, {type: "L", x: 18, y: 28}, {type: "L", x: 15, y: 26}, {type: "L", x: 12, y: 28}, {type: "L", x: 13, y: 25}, {type: "L", x: 11, y: 23}, {type: "L", x: 14, y: 23}, {type: "Z"}
        ]
    },
    {
        name: "scream_lines_radial",
        displayName: "😱 Radial Scream",
        category: "emotion",
        path: [
            // Fanning lines radiating outward from center
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 10}, {type: "L", x: 52, y: 10}, {type: "L", x: 52, y: 50}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 73, y: 17}, {type: "L", x: 74, y: 19}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 90, y: 40}, {type: "L", x: 90, y: 42}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 90, y: 60}, {type: "L", x: 90, y: 62}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 73, y: 83}, {type: "L", x: 74, y: 85}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 90}, {type: "L", x: 52, y: 90}, {type: "L", x: 52, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 27, y: 83}, {type: "L", x: 26, y: 85}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 10, y: 60}, {type: "L", x: 10, y: 62}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 10, y: 40}, {type: "L", x: 10, y: 42}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 27, y: 17}, {type: "L", x: 26, y: 19}, {type: "L", x: 48, y: 52}, {type: "Z"}
        ]
    },
    {
        name: "scream_lines_cone",
        displayName: "📢 Cone Scream",
        category: "emotion",
        path: [
            // Fanning lines in cone shape (like shouting to the right)
            {type: "M", x: 15, y: 47}, {type: "L", x: 75, y: 25}, {type: "L", x: 76, y: 27}, {type: "L", x: 15, y: 49}, {type: "Z"},
            {type: "M", x: 15, y: 50}, {type: "L", x: 85, y: 35}, {type: "L", x: 86, y: 37}, {type: "L", x: 15, y: 52}, {type: "Z"},
            {type: "M", x: 15, y: 53}, {type: "L", x: 90, y: 48}, {type: "L", x: 90, y: 50}, {type: "L", x: 15, y: 55}, {type: "Z"},
            {type: "M", x: 15, y: 47}, {type: "L", x: 85, y: 63}, {type: "L", x: 86, y: 65}, {type: "L", x: 15, y: 49}, {type: "Z"},
            {type: "M", x: 15, y: 44}, {type: "L", x: 75, y: 75}, {type: "L", x: 76, y: 77}, {type: "L", x: 15, y: 46}, {type: "Z"}
        ]
    },
    {
        name: "jiggle_lines",
        displayName: "〰️ Jiggle Lines",
        category: "comic",
        path: [
            // Wavy trembling lines for shaking/vibrating effects
            {type: "M", x: 10, y: 25},
            {type: "Q", cpx: 20, cpy: 23, x: 30, y: 25},
            {type: "Q", cpx: 40, cpy: 27, x: 50, y: 25},
            {type: "Q", cpx: 60, cpy: 23, x: 70, y: 25},
            {type: "Q", cpx: 80, cpy: 27, x: 90, y: 25},
            {type: "L", x: 90, y: 27},
            {type: "Q", cpx: 80, cpy: 29, x: 70, y: 27},
            {type: "Q", cpx: 60, cpy: 25, x: 50, y: 27},
            {type: "Q", cpx: 40, cpy: 29, x: 30, y: 27},
            {type: "Q", cpx: 20, cpy: 25, x: 10, y: 27},
            {type: "Z"},
            {type: "M", x: 15, y: 45},
            {type: "Q", cpx: 25, cpy: 43, x: 35, y: 45},
            {type: "Q", cpx: 45, cpy: 47, x: 55, y: 45},
            {type: "Q", cpx: 65, cpy: 43, x: 75, y: 45},
            {type: "Q", cpx: 80, cpy: 47, x: 85, y: 45},
            {type: "L", x: 85, y: 47},
            {type: "Q", cpx: 80, cpy: 49, x: 75, y: 47},
            {type: "Q", cpx: 65, cpy: 45, x: 55, y: 47},
            {type: "Q", cpx: 45, cpy: 49, x: 35, y: 47},
            {type: "Q", cpx: 25, cpy: 45, x: 15, y: 47},
            {type: "Z"},
            {type: "M", x: 10, y: 65},
            {type: "Q", cpx: 20, cpy: 63, x: 30, y: 65},
            {type: "Q", cpx: 40, cpy: 67, x: 50, y: 65},
            {type: "Q", cpx: 60, cpy: 63, x: 70, y: 65},
            {type: "Q", cpx: 80, cpy: 67, x: 90, y: 65},
            {type: "L", x: 90, y: 67},
            {type: "Q", cpx: 80, cpy: 69, x: 70, y: 67},
            {type: "Q", cpx: 60, cpy: 65, x: 50, y: 67},
            {type: "Q", cpx: 40, cpy: 69, x: 30, y: 67},
            {type: "Q", cpx: 20, cpy: 65, x: 10, y: 67},
            {type: "Z"}
        ]
    },
    {
        name: "motion_lines_curved",
        displayName: "⤴ Curved Motion",
        category: "comic",
        path: [
            // Curved motion lines (sweeping arc)
            {type: "M", x: 20, y: 70}, {type: "Q", cpx: 30, cpy: 40, x: 60, y: 25}, {type: "L", x: 62, y: 27}, {type: "Q", cpx: 32, cpy: 42, x: 22, y: 72}, {type: "Z"},
            {type: "M", x: 25, y: 80}, {type: "Q", cpx: 40, cpy: 50, x: 75, y: 30}, {type: "L", x: 77, y: 32}, {type: "Q", cpx: 42, cpy: 52, x: 27, y: 82}, {type: "Z"},
            {type: "M", x: 15, y: 60}, {type: "Q", cpx: 25, cpy: 35, x: 50, y: 20}, {type: "L", x: 52, y: 22}, {type: "Q", cpx: 27, cpy: 37, x: 17, y: 62}, {type: "Z"},
            {type: "M", x: 30, y: 85}, {type: "Q", cpx: 50, cpy: 60, x: 85, y: 40}, {type: "L", x: 87, y: 42}, {type: "Q", cpx: 52, cpy: 62, x: 32, y: 87}, {type: "Z"}
        ]
    },
    {
        name: "concentrated_lines",
        displayName: "😤 Concentration Lines",
        category: "emotion",
        path: [
            // Vertical lines for concentration/focus effect
            {type: "M", x: 15, y: 20}, {type: "L", x: 15, y: 80}, {type: "L", x: 17, y: 80}, {type: "L", x: 17, y: 20}, {type: "Z"},
            {type: "M", x: 25, y: 15}, {type: "L", x: 25, y: 85}, {type: "L", x: 27, y: 85}, {type: "L", x: 27, y: 15}, {type: "Z"},
            {type: "M", x: 35, y: 20}, {type: "L", x: 35, y: 80}, {type: "L", x: 37, y: 80}, {type: "L", x: 37, y: 20}, {type: "Z"},
            {type: "M", x: 45, y: 10}, {type: "L", x: 45, y: 90}, {type: "L", x: 47, y: 90}, {type: "L", x: 47, y: 10}, {type: "Z"},
            {type: "M", x: 55, y: 10}, {type: "L", x: 55, y: 90}, {type: "L", x: 57, y: 90}, {type: "L", x: 57, y: 10}, {type: "Z"},
            {type: "M", x: 65, y: 20}, {type: "L", x: 65, y: 80}, {type: "L", x: 67, y: 80}, {type: "L", x: 67, y: 20}, {type: "Z"},
            {type: "M", x: 75, y: 15}, {type: "L", x: 75, y: 85}, {type: "L", x: 77, y: 85}, {type: "L", x: 77, y: 15}, {type: "Z"},
            {type: "M", x: 85, y: 20}, {type: "L", x: 85, y: 80}, {type: "L", x: 87, y: 80}, {type: "L", x: 87, y: 20}, {type: "Z"}
        ]
    },
    {
        name: "heat_waves",
        displayName: "🔥 Heat Waves",
        category: "comic",
        path: [
            // Wavy rising heat lines - short, medium, long lengths
            // Short heat wave 1
            {type: "M", x: 15, y: 70},
            {type: "Q", cpx: 13, cpy: 65, x: 15, y: 60},
            {type: "Q", cpx: 17, cpy: 55, x: 15, y: 50},
            {type: "L", x: 17, y: 50},
            {type: "Q", cpx: 19, cpy: 55, x: 17, y: 60},
            {type: "Q", cpx: 15, cpy: 65, x: 17, y: 70},
            {type: "Z"},
            // Long heat wave 1
            {type: "M", x: 28, y: 85},
            {type: "Q", cpx: 26, cpy: 75, x: 28, y: 65},
            {type: "Q", cpx: 30, cpy: 55, x: 28, y: 45},
            {type: "Q", cpx: 26, cpy: 35, x: 28, y: 25},
            {type: "Q", cpx: 30, cpy: 15, x: 28, y: 10},
            {type: "L", x: 30, y: 10},
            {type: "Q", cpx: 32, cpy: 15, x: 30, y: 25},
            {type: "Q", cpx: 28, cpy: 35, x: 30, y: 45},
            {type: "Q", cpx: 32, cpy: 55, x: 30, y: 65},
            {type: "Q", cpx: 28, cpy: 75, x: 30, y: 85},
            {type: "Z"},
            // Medium heat wave 1
            {type: "M", x: 42, y: 75},
            {type: "Q", cpx: 40, cpy: 65, x: 42, y: 55},
            {type: "Q", cpx: 44, cpy: 45, x: 42, y: 35},
            {type: "Q", cpx: 40, cpy: 25, x: 42, y: 20},
            {type: "L", x: 44, y: 20},
            {type: "Q", cpx: 46, cpy: 25, x: 44, y: 35},
            {type: "Q", cpx: 42, cpy: 45, x: 44, y: 55},
            {type: "Q", cpx: 46, cpy: 65, x: 44, y: 75},
            {type: "Z"},
            // Long heat wave 2
            {type: "M", x: 56, y: 90},
            {type: "Q", cpx: 54, cpy: 80, x: 56, y: 70},
            {type: "Q", cpx: 58, cpy: 60, x: 56, y: 50},
            {type: "Q", cpx: 54, cpy: 40, x: 56, y: 30},
            {type: "Q", cpx: 58, cpy: 20, x: 56, y: 15},
            {type: "L", x: 58, y: 15},
            {type: "Q", cpx: 60, cpy: 20, x: 58, y: 30},
            {type: "Q", cpx: 56, cpy: 40, x: 58, y: 50},
            {type: "Q", cpx: 60, cpy: 60, x: 58, y: 70},
            {type: "Q", cpx: 56, cpy: 80, x: 58, y: 90},
            {type: "Z"},
            // Short heat wave 2
            {type: "M", x: 70, y: 65},
            {type: "Q", cpx: 68, cpy: 60, x: 70, y: 55},
            {type: "Q", cpx: 72, cpy: 50, x: 70, y: 45},
            {type: "L", x: 72, y: 45},
            {type: "Q", cpx: 74, cpy: 50, x: 72, y: 55},
            {type: "Q", cpx: 70, cpy: 60, x: 72, y: 65},
            {type: "Z"},
            // Medium heat wave 2
            {type: "M", x: 82, y: 80},
            {type: "Q", cpx: 80, cpy: 70, x: 82, y: 60},
            {type: "Q", cpx: 84, cpy: 50, x: 82, y: 40},
            {type: "Q", cpx: 80, cpy: 30, x: 82, y: 25},
            {type: "L", x: 84, y: 25},
            {type: "Q", cpx: 86, cpy: 30, x: 84, y: 40},
            {type: "Q", cpx: 82, cpy: 50, x: 84, y: 60},
            {type: "Q", cpx: 86, cpy: 70, x: 84, y: 80},
            {type: "Z"}
        ]
    },
    // Western Comic Motion Stamps
    {
        name: "afterimage_blur",
        displayName: "💨 Afterimage Blur",
        category: "motion",
        path: [
            // Multiple offset silhouettes (simple rectangles for demo - represents moving figure)
            {type: "M", x: 70, y: 35}, {type: "L", x: 85, y: 35}, {type: "L", x: 85, y: 65}, {type: "L", x: 70, y: 65}, {type: "Z"},
            {type: "M", x: 55, y: 37}, {type: "L", x: 68, y: 37}, {type: "L", x: 68, y: 63}, {type: "L", x: 55, y: 63}, {type: "Z"},
            {type: "M", x: 40, y: 39}, {type: "L", x: 53, y: 39}, {type: "L", x: 53, y: 61}, {type: "L", x: 40, y: 61}, {type: "Z"},
            {type: "M", x: 25, y: 41}, {type: "L", x: 38, y: 41}, {type: "L", x: 38, y: 59}, {type: "L", x: 25, y: 59}, {type: "Z"},
            {type: "M", x: 10, y: 43}, {type: "L", x: 23, y: 43}, {type: "L", x: 23, y: 57}, {type: "L", x: 10, y: 57}, {type: "Z"}
        ]
    },
    {
        name: "punch_impact",
        displayName: "👊 Punch Impact",
        category: "motion",
        path: [
            // Short radiating lines from center impact point
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 30}, {type: "L", x: 52, y: 30}, {type: "L", x: 51, y: 50}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 65, y: 35}, {type: "L", x: 66, y: 37}, {type: "L", x: 52, y: 51}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 70, y: 48}, {type: "L", x: 70, y: 50}, {type: "L", x: 52, y: 51}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 65, y: 65}, {type: "L", x: 66, y: 67}, {type: "L", x: 51, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 70}, {type: "L", x: 52, y: 70}, {type: "L", x: 51, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 35, y: 65}, {type: "L", x: 34, y: 67}, {type: "L", x: 48, y: 52}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 30, y: 48}, {type: "L", x: 30, y: 50}, {type: "L", x: 48, y: 51}, {type: "Z"},
            {type: "M", x: 50, y: 50}, {type: "L", x: 35, y: 35}, {type: "L", x: 34, y: 37}, {type: "L", x: 48, y: 51}, {type: "Z"}
        ]
    },
    {
        name: "swing_arc",
        displayName: "⚔️ Swing Arc",
        category: "motion",
        path: [
            // Clean curved arc with thickness variation
            {type: "M", x: 15, y: 70},
            {type: "Q", cpx: 30, cpy: 30, x: 70, y: 15},
            {type: "Q", cpx: 72, cpy: 16, x: 73, y: 18},
            {type: "Q", cpx: 35, cpy: 35, x: 20, y: 75},
            {type: "Z"},
            {type: "M", x: 25, y: 78},
            {type: "Q", cpx: 45, cpy: 45, x: 78, y: 22},
            {type: "Q", cpx: 80, cpy: 23, x: 81, y: 25},
            {type: "Q", cpx: 50, cpy: 50, x: 30, y: 83},
            {type: "Z"}
        ]
    },
    {
        name: "spin_vortex",
        displayName: "🌪️ Spin Vortex",
        category: "motion",
        path: [
            // Circular spiral rotation lines
            {type: "M", x: 50, y: 20},
            {type: "Q", cpx: 75, cpy: 25, x: 75, y: 50},
            {type: "Q", cpx: 75, cpy: 75, x: 50, y: 75},
            {type: "Q", cpx: 25, cpy: 75, x: 25, y: 50},
            {type: "Q", cpx: 25, cpy: 30, x: 42, y: 25},
            {type: "L", x: 42, y: 27},
            {type: "Q", cpx: 27, cpy: 32, x: 27, y: 50},
            {type: "Q", cpx: 27, cpy: 73, x: 50, y: 73},
            {type: "Q", cpx: 73, cpy: 73, x: 73, y: 50},
            {type: "Q", cpx: 73, cpy: 27, x: 50, y: 22},
            {type: "Z"}
        ]
    },
    {
        name: "downward_slam",
        displayName: "⬇️ Downward Slam",
        category: "motion",
        path: [
            // Lines converging downward to impact point
            {type: "M", x: 50, y: 10}, {type: "L", x: 48, y: 70}, {type: "L", x: 50, y: 70}, {type: "L", x: 52, y: 70}, {type: "Z"},
            {type: "M", x: 30, y: 15}, {type: "L", x: 43, y: 68}, {type: "L", x: 45, y: 68}, {type: "L", x: 32, y: 15}, {type: "Z"},
            {type: "M", x: 70, y: 15}, {type: "L", x: 57, y: 68}, {type: "L", x: 55, y: 68}, {type: "L", x: 68, y: 15}, {type: "Z"},
            {type: "M", x: 20, y: 25}, {type: "L", x: 38, y: 66}, {type: "L", x: 40, y: 66}, {type: "L", x: 22, y: 25}, {type: "Z"},
            {type: "M", x: 80, y: 25}, {type: "L", x: 62, y: 66}, {type: "L", x: 60, y: 66}, {type: "L", x: 78, y: 25}, {type: "Z"},
            // Impact base
            {type: "M", x: 25, y: 70}, {type: "L", x: 75, y: 70}, {type: "L", x: 70, y: 75}, {type: "L", x: 30, y: 75}, {type: "Z"}
        ]
    },
    {
        name: "lateral_dash",
        displayName: "➡️ Lateral Dash",
        category: "motion",
        path: [
            // Horizontal ribbons with taper (left to right movement)
            {type: "M", x: 5, y: 25}, {type: "L", x: 80, y: 23}, {type: "L", x: 85, y: 25}, {type: "L", x: 80, y: 27}, {type: "L", x: 5, y: 29}, {type: "Z"},
            {type: "M", x: 10, y: 40}, {type: "L", x: 85, y: 38}, {type: "L", x: 90, y: 40}, {type: "L", x: 85, y: 42}, {type: "L", x: 10, y: 44}, {type: "Z"},
            {type: "M", x: 8, y: 55}, {type: "L", x: 82, y: 53}, {type: "L", x: 87, y: 55}, {type: "L", x: 82, y: 57}, {type: "L", x: 8, y: 59}, {type: "Z"},
            {type: "M", x: 12, y: 70}, {type: "L", x: 78, y: 68}, {type: "L", x: 83, y: 70}, {type: "L", x: 78, y: 72}, {type: "L", x: 12, y: 74}, {type: "Z"}
        ]
    },
    {
        name: "jump_parabola",
        displayName: "⬆️ Jump Arc",
        category: "motion",
        path: [
            // Arc showing upward jump trajectory
            {type: "M", x: 15, y: 80},
            {type: "Q", cpx: 35, cpy: 20, x: 50, y: 15},
            {type: "Q", cpx: 65, cpy: 20, x: 85, y: 80},
            {type: "L", x: 83, y: 82},
            {type: "Q", cpx: 65, cpy: 25, x: 50, y: 20},
            {type: "Q", cpx: 35, cpy: 25, x: 17, y: 82},
            {type: "Z"},
            // Small marks along the arc
            {type: "M", x: 30, y: 45}, {type: "L", x: 32, y: 43}, {type: "L", x: 34, y: 45}, {type: "L", x: 32, y: 47}, {type: "Z"},
            {type: "M", x: 50, y: 18}, {type: "L", x: 52, y: 16}, {type: "L", x: 54, y: 18}, {type: "L", x: 52, y: 20}, {type: "Z"},
            {type: "M", x: 70, y: 45}, {type: "L", x: 72, y: 43}, {type: "L", x: 74, y: 45}, {type: "L", x: 72, y: 47}, {type: "Z"}
        ]
    },
    {
        name: "shake_vibrate",
        displayName: "📳 Shake Lines",
        category: "motion",
        path: [
            // Small parallel offset lines showing vibration
            {type: "M", x: 35, y: 25}, {type: "L", x: 40, y: 25}, {type: "L", x: 40, y: 75}, {type: "L", x: 35, y: 75}, {type: "Z"},
            {type: "M", x: 45, y: 20}, {type: "L", x: 50, y: 20}, {type: "L", x: 50, y: 80}, {type: "L", x: 45, y: 80}, {type: "Z"},
            {type: "M", x: 55, y: 25}, {type: "L", x: 60, y: 25}, {type: "L", x: 60, y: 75}, {type: "L", x: 55, y: 75}, {type: "Z"},
            {type: "M", x: 30, y: 30}, {type: "L", x: 33, y: 30}, {type: "L", x: 33, y: 70}, {type: "L", x: 30, y: 70}, {type: "Z"},
            {type: "M", x: 62, y: 30}, {type: "L", x: 65, y: 30}, {type: "L", x: 65, y: 70}, {type: "L", x: 62, y: 70}, {type: "Z"}
        ]
    },
    {
        name: "wind_pressure",
        displayName: "💨 Wind Pressure",
        category: "motion",
        path: [
            // Flowing curved air pressure lines
            {type: "M", x: 10, y: 25},
            {type: "Q", cpx: 30, cpy: 20, x: 50, y: 25},
            {type: "Q", cpx: 70, cpy: 30, x: 90, y: 25},
            {type: "L", x: 90, y: 27},
            {type: "Q", cpx: 70, cpy: 32, x: 50, y: 27},
            {type: "Q", cpx: 30, cpy: 22, x: 10, y: 27},
            {type: "Z"},
            {type: "M", x: 15, y: 45},
            {type: "Q", cpx: 35, cpy: 42, x: 55, y: 45},
            {type: "Q", cpx: 70, cpy: 48, x: 85, y: 45},
            {type: "L", x: 85, y: 47},
            {type: "Q", cpx: 70, cpy: 50, x: 55, y: 47},
            {type: "Q", cpx: 35, cpy: 44, x: 15, y: 47},
            {type: "Z"},
            {type: "M", x: 10, y: 65},
            {type: "Q", cpx: 30, cpy: 62, x: 50, y: 65},
            {type: "Q", cpx: 65, cpy: 68, x: 80, y: 65},
            {type: "L", x: 80, y: 67},
            {type: "Q", cpx: 65, cpy: 70, x: 50, y: 67},
            {type: "Q", cpx: 30, cpy: 64, x: 10, y: 67},
            {type: "Z"}
        ]
    },

    // =====================================================
    // NEW CARTOON BRUSH SHAPES (Research Project 2025)
    // All shapes below are original creations
    // =====================================================

    // Additional Motion Shapes
    {
        name: "dust_cloud_running",
        displayName: "💨 Dust Cloud",
        category: "motion",
        path: [
            {type: "M", x: 15, y: 60},
            {type: "Q", cpx: 10, cpy: 55, x: 12, y: 50},
            {type: "Q", cpx: 10, cpy: 45, x: 15, y: 42},
            {type: "Q", cpx: 20, cpy: 38, x: 28, y: 40},
            {type: "Q", cpx: 35, cpy: 38, x: 38, y: 42},
            {type: "Q", cpx: 42, cpy: 45, x: 40, y: 50},
            {type: "Q", cpx: 42, cpy: 55, x: 38, y: 60},
            {type: "Q", cpx: 30, cpy: 65, x: 25, y: 63},
            {type: "Q", cpx: 18, cpy: 65, x: 15, y: 60},
            {type: "Z"},
            {type: "M", x: 35, y: 65},
            {type: "Q", cpx: 32, cpy: 60, x: 35, y: 55},
            {type: "Q", cpx: 40, cpy: 52, x: 48, y: 55},
            {type: "Q", cpx: 55, cpy: 58, x: 55, y: 65},
            {type: "Q", cpx: 52, cpy: 70, x: 45, y: 70},
            {type: "Q", cpx: 38, cpy: 70, x: 35, y: 65},
            {type: "Z"},
            {type: "M", x: 52, y: 68},
            {type: "Q", cpx: 50, cpy: 65, x: 53, y: 62},
            {type: "Q", cpx: 58, cpy: 60, x: 63, y: 62},
            {type: "Q", cpx: 68, cpy: 65, x: 65, y: 68},
            {type: "Q", cpx: 60, cpy: 72, x: 55, y: 71},
            {type: "Q", cpx: 52, cpy: 72, x: 52, y: 68},
            {type: "Z"}
        ]
    },
    {
        name: "wobble_lines_vertical",
        displayName: "〰️ Wobble Vertical",
        category: "motion",
        path: [
            {type: "M", x: 25, y: 20},
            {type: "Q", cpx: 23, cpy: 30, x: 25, y: 40},
            {type: "Q", cpx: 27, cpy: 50, x: 25, y: 60},
            {type: "Q", cpx: 23, cpy: 70, x: 25, y: 80},
            {type: "L", x: 27, y: 80},
            {type: "Q", cpx: 25, cpy: 70, x: 27, y: 60},
            {type: "Q", cpx: 29, cpy: 50, x: 27, y: 40},
            {type: "Q", cpx: 25, cpy: 30, x: 27, y: 20},
            {type: "Z"},
            {type: "M", x: 49, y: 15},
            {type: "Q", cpx: 47, cpy: 28, x: 49, y: 40},
            {type: "Q", cpx: 51, cpy: 52, x: 49, y: 65},
            {type: "Q", cpx: 47, cpy: 78, x: 49, y: 85},
            {type: "L", x: 51, y: 85},
            {type: "Q", cpx: 53, cpy: 78, x: 51, y: 65},
            {type: "Q", cpx: 49, cpy: 52, x: 51, y: 40},
            {type: "Q", cpx: 53, cpy: 28, x: 51, y: 15},
            {type: "Z"},
            {type: "M", x: 73, y: 20},
            {type: "Q", cpx: 71, cpy: 30, x: 73, y: 40},
            {type: "Q", cpx: 75, cpy: 50, x: 73, y: 60},
            {type: "Q", cpx: 71, cpy: 70, x: 73, y: 80},
            {type: "L", x: 75, y: 80},
            {type: "Q", cpx: 77, cpy: 70, x: 75, y: 60},
            {type: "Q", cpx: 73, cpy: 50, x: 75, y: 40},
            {type: "Q", cpx: 77, cpy: 30, x: 75, y: 20},
            {type: "Z"}
        ]
    },
    {
        name: "skid_marks",
        displayName: "🛞 Skid Marks",
        category: "motion",
        path: [
            {type: "M", x: 10, y: 30},
            {type: "Q", cpx: 35, cpy: 28, x: 60, y: 32},
            {type: "Q", cpx: 75, cpy: 35, x: 85, y: 30},
            {type: "L", x: 86, y: 32},
            {type: "Q", cpx: 76, cpy: 37, x: 60, y: 35},
            {type: "Q", cpx: 35, cpy: 31, x: 10, y: 33},
            {type: "Z"},
            {type: "M", x: 15, y: 48},
            {type: "Q", cpx: 40, cpy: 46, x: 65, y: 50},
            {type: "Q", cpx: 78, cpy: 53, x: 88, y: 48},
            {type: "L", x: 89, y: 50},
            {type: "Q", cpx: 79, cpy: 55, x: 65, y: 53},
            {type: "Q", cpx: 40, cpy: 49, x: 15, y: 51},
            {type: "Z"},
            {type: "M", x: 20, y: 66},
            {type: "Q", cpx: 45, cpy: 64, x: 70, y: 68},
            {type: "Q", cpx: 80, cpy: 71, x: 90, y: 66},
            {type: "L", x: 91, y: 68},
            {type: "Q", cpx: 81, cpy: 73, x: 70, y: 71},
            {type: "Q", cpx: 45, cpy: 67, x: 20, y: 69},
            {type: "Z"}
        ]
    },
    {
        name: "bounce_arc",
        displayName: "⤴️ Bounce Arc",
        category: "motion",
        path: [
            {type: "M", x: 20, y: 70},
            {type: "Q", cpx: 35, cpy: 25, x: 50, y: 15},
            {type: "Q", cpx: 65, cpy: 25, x: 80, y: 70},
            {type: "L", x: 78, y: 72},
            {type: "Q", cpx: 65, cpy: 30, x: 50, y: 20},
            {type: "Q", cpx: 35, cpy: 30, x: 22, y: 72},
            {type: "Z"},
            {type: "M", x: 35, y: 40}, {type: "L", x: 37, y: 38}, {type: "L", x: 39, y: 40}, {type: "L", x: 37, y: 42}, {type: "Z"},
            {type: "M", x: 50, y: 18}, {type: "L", x: 52, y: 16}, {type: "L", x: 54, y: 18}, {type: "L", x: 52, y: 20}, {type: "Z"},
            {type: "M", x: 65, y: 40}, {type: "L", x: 67, y: 38}, {type: "L", x: 69, y: 40}, {type: "L", x: 67, y: 42}, {type: "Z"}
        ]
    },
    {
        name: "trajectory_arc",
        displayName: "⚾ Trajectory",
        category: "motion",
        path: [
            {type: "M", x: 10, y: 75}, {type: "L", x: 12, y: 73}, {type: "L", x: 14, y: 75}, {type: "L", x: 12, y: 77}, {type: "Z"},
            {type: "M", x: 20, y: 60}, {type: "L", x: 22, y: 58}, {type: "L", x: 24, y: 60}, {type: "L", x: 22, y: 62}, {type: "Z"},
            {type: "M", x: 30, y: 45}, {type: "L", x: 32, y: 43}, {type: "L", x: 34, y: 45}, {type: "L", x: 32, y: 47}, {type: "Z"},
            {type: "M", x: 40, y: 32}, {type: "L", x: 42, y: 30}, {type: "L", x: 44, y: 32}, {type: "L", x: 42, y: 34}, {type: "Z"},
            {type: "M", x: 50, y: 22}, {type: "L", x: 52, y: 20}, {type: "L", x: 54, y: 22}, {type: "L", x: 52, y: 24}, {type: "Z"},
            {type: "M", x: 60, y: 32}, {type: "L", x: 62, y: 30}, {type: "L", x: 64, y: 32}, {type: "L", x: 62, y: 34}, {type: "Z"},
            {type: "M", x: 70, y: 45}, {type: "L", x: 72, y: 43}, {type: "L", x: 74, y: 45}, {type: "L", x: 72, y: 47}, {type: "Z"},
            {type: "M", x: 80, y: 60}, {type: "L", x: 82, y: 58}, {type: "L", x: 84, y: 60}, {type: "L", x: 82, y: 62}, {type: "Z"},
            {type: "M", x: 90, y: 75}, {type: "L", x: 92, y: 73}, {type: "L", x: 94, y: 75}, {type: "L", x: 92, y: 77}, {type: "Z"}
        ]
    },
    {
        name: "dizzy_stars_orbit",
        displayName: "⭐ Dizzy Stars",
        category: "motion",
        path: [
            {type: "M", x: 50, y: 15},
            {type: "Q", cpx: 70, cpy: 20, x: 75, y: 40},
            {type: "Q", cpx: 70, cpy: 60, x: 50, y: 65},
            {type: "Q", cpx: 30, cpy: 60, x: 25, y: 40},
            {type: "Q", cpx: 30, cpy: 20, x: 50, y: 15},
            {type: "L", x: 50, y: 17},
            {type: "Q", cpx: 32, cpy: 22, x: 27, y: 40},
            {type: "Q", cpx: 32, cpy: 58, x: 50, y: 63},
            {type: "Q", cpx: 68, cpy: 58, x: 73, y: 40},
            {type: "Q", cpx: 68, cpy: 22, x: 50, y: 17},
            {type: "Z"},
            {type: "M", x: 50, y: 8}, {type: "L", x: 51, y: 12}, {type: "L", x: 55, y: 12},
            {type: "L", x: 52, y: 14}, {type: "L", x: 53, y: 18}, {type: "L", x: 50, y: 15},
            {type: "L", x: 47, y: 18}, {type: "L", x: 48, y: 14}, {type: "L", x: 45, y: 12},
            {type: "L", x: 49, y: 12}, {type: "Z"},
            {type: "M", x: 80, y: 40}, {type: "L", x: 81, y: 42}, {type: "L", x: 85, y: 42},
            {type: "L", x: 82, y: 44}, {type: "L", x: 83, y: 48}, {type: "L", x: 80, y: 45},
            {type: "L", x: 77, y: 48}, {type: "L", x: 78, y: 44}, {type: "L", x: 75, y: 42},
            {type: "L", x: 79, y: 42}, {type: "Z"},
            {type: "M", x: 50, y: 72}, {type: "L", x: 51, y: 74}, {type: "L", x: 55, y: 74},
            {type: "L", x: 52, y: 76}, {type: "L", x: 53, y: 80}, {type: "L", x: 50, y: 77},
            {type: "L", x: 47, y: 80}, {type: "L", x: 48, y: 76}, {type: "L", x: 45, y: 74},
            {type: "L", x: 49, y: 74}, {type: "Z"},
            {type: "M", x: 20, y: 40}, {type: "L", x: 21, y: 42}, {type: "L", x: 25, y: 42},
            {type: "L", x: 22, y: 44}, {type: "L", x: 23, y: 48}, {type: "L", x: 20, y: 45},
            {type: "L", x: 17, y: 48}, {type: "L", x: 18, y: 44}, {type: "L", x: 15, y: 42},
            {type: "L", x: 19, y: 42}, {type: "Z"}
        ]
    },
    {
        name: "speed_whoosh_enhanced",
        displayName: "💨 Speed Whoosh+",
        category: "motion",
        path: [
            {type: "M", x: 5, y: 25},
            {type: "Q", cpx: 35, cpy: 22, x: 65, y: 24},
            {type: "L", x: 92, y: 25},
            {type: "L", x: 95, y: 26},
            {type: "L", x: 92, y: 27},
            {type: "L", x: 67, y: 28},
            {type: "Q", cpx: 37, cpy: 30, x: 10, y: 33},
            {type: "Z"},
            {type: "M", x: 10, y: 45},
            {type: "Q", cpx: 40, cpy: 43, x: 70, y: 45},
            {type: "L", x: 94, y: 46},
            {type: "L", x: 96, y: 47},
            {type: "L", x: 94, y: 48},
            {type: "L", x: 72, y: 49},
            {type: "Q", cpx: 42, cpy: 51, x: 15, y: 54},
            {type: "Z"},
            {type: "M", x: 5, y: 65},
            {type: "Q", cpx: 35, cpy: 63, x: 65, y: 65},
            {type: "L", x: 90, y: 66},
            {type: "L", x: 93, y: 67},
            {type: "L", x: 90, y: 68},
            {type: "L", x: 67, y: 70},
            {type: "Q", cpx: 37, cpy: 72, x: 10, y: 75},
            {type: "Z"}
        ]
    },

    // Additional Emotion Shapes
    {
        name: "x_eyes_knockout",
        displayName: "✖️ X Eyes",
        category: "emotion",
        path: [
            {type: "M", x: 25, y: 35}, {type: "L", x: 30, y: 40}, {type: "L", x: 35, y: 35},
            {type: "L", x: 37, y: 37}, {type: "L", x: 32, y: 42}, {type: "L", x: 37, y: 47},
            {type: "L", x: 35, y: 49}, {type: "L", x: 30, y: 44}, {type: "L", x: 25, y: 49},
            {type: "L", x: 23, y: 47}, {type: "L", x: 28, y: 42}, {type: "L", x: 23, y: 37},
            {type: "Z"},
            {type: "M", x: 65, y: 35}, {type: "L", x: 70, y: 40}, {type: "L", x: 75, y: 35},
            {type: "L", x: 77, y: 37}, {type: "L", x: 72, y: 42}, {type: "L", x: 77, y: 47},
            {type: "L", x: 75, y: 49}, {type: "L", x: 70, y: 44}, {type: "L", x: 65, y: 49},
            {type: "L", x: 63, y: 47}, {type: "L", x: 68, y: 42}, {type: "L", x: 63, y: 37},
            {type: "Z"}
        ]
    },
    {
        name: "blush_lines_diagonal",
        displayName: "😊 Blush Lines",
        category: "emotion",
        path: [
            {type: "M", x: 15, y: 45}, {type: "L", x: 20, y: 50}, {type: "L", x: 19, y: 52}, {type: "L", x: 14, y: 47}, {type: "Z"},
            {type: "M", x: 18, y: 42}, {type: "L", x: 23, y: 47}, {type: "L", x: 22, y: 49}, {type: "L", x: 17, y: 44}, {type: "Z"},
            {type: "M", x: 21, y: 39}, {type: "L", x: 26, y: 44}, {type: "L", x: 25, y: 46}, {type: "L", x: 20, y: 41}, {type: "Z"},
            {type: "M", x: 24, y: 36}, {type: "L", x: 29, y: 41}, {type: "L", x: 28, y: 43}, {type: "L", x: 23, y: 38}, {type: "Z"},
            {type: "M", x: 80, y: 45}, {type: "L", x: 85, y: 50}, {type: "L", x: 84, y: 52}, {type: "L", x: 79, y: 47}, {type: "Z"},
            {type: "M", x: 77, y: 42}, {type: "L", x: 82, y: 47}, {type: "L", x: 81, y: 49}, {type: "L", x: 76, y: 44}, {type: "Z"},
            {type: "M", x: 74, y: 39}, {type: "L", x: 79, y: 44}, {type: "L", x: 78, y: 46}, {type: "L", x: 73, y: 41}, {type: "Z"},
            {type: "M", x: 71, y: 36}, {type: "L", x: 76, y: 41}, {type: "L", x: 75, y: 43}, {type: "L", x: 70, y: 38}, {type: "Z"}
        ]
    },
    {
        name: "shock_lightning",
        displayName: "⚡ Shock",
        category: "emotion",
        path: [
            {type: "M", x: 55, y: 15},
            {type: "L", x: 40, y: 45},
            {type: "L", x: 48, y: 45},
            {type: "L", x: 35, y: 85},
            {type: "L", x: 55, y: 55},
            {type: "L", x: 47, y: 55},
            {type: "L", x: 65, y: 15},
            {type: "Z"}
        ]
    },
    {
        name: "sweat_drop_large",
        displayName: "💦 Sweat Drop",
        category: "emotion",
        path: [
            {type: "M", x: 50, y: 20},
            {type: "L", x: 62, y: 45},
            {type: "Q", cpx: 68, cpy: 55, x: 65, y: 65},
            {type: "Q", cpx: 60, cpy: 75, x: 50, y: 80},
            {type: "Q", cpx: 40, cpy: 75, x: 35, y: 65},
            {type: "Q", cpx: 32, cpy: 55, x: 38, y: 45},
            {type: "Z"},
            {type: "M", x: 45, y: 35},
            {type: "Q", cpx: 48, cpy: 33, x: 52, y: 35},
            {type: "Q", cpx: 54, cpy: 37, x: 52, y: 40},
            {type: "Q", cpx: 50, cpy: 42, x: 47, y: 40},
            {type: "Q", cpx: 44, cpy: 37, x: 45, y: 35},
            {type: "Z"}
        ]
    },
    {
        name: "spiral_eyes_dizzy",
        displayName: "😵‍💫 Spiral Eyes",
        category: "emotion",
        path: [
            {type: "M", x: 30, y: 42},
            {type: "Q", cpx: 32, cpy: 40, x: 34, y: 42},
            {type: "Q", cpx: 35, cpy: 45, x: 32, y: 47},
            {type: "Q", cpx: 28, cpy: 48, x: 25, y: 45},
            {type: "Q", cpx: 23, cpy: 41, x: 26, y: 38},
            {type: "Q", cpx: 31, cpy: 35, x: 36, y: 38},
            {type: "L", x: 36, y: 39},
            {type: "Q", cpx: 32, cpy: 36, x: 27, y: 39},
            {type: "Q", cpx: 24, cpy: 42, x: 26, y: 45},
            {type: "Q", cpx: 29, cpy: 47, x: 32, y: 46},
            {type: "Q", cpx: 34, cpy: 44, x: 33, y: 42},
            {type: "Q", cpx: 32, cpy: 41, x: 30, y: 42},
            {type: "Z"},
            {type: "M", x: 70, y: 42},
            {type: "Q", cpx: 72, cpy: 40, x: 74, y: 42},
            {type: "Q", cpx: 75, cpy: 45, x: 72, y: 47},
            {type: "Q", cpx: 68, cpy: 48, x: 65, y: 45},
            {type: "Q", cpx: 63, cpy: 41, x: 66, y: 38},
            {type: "Q", cpx: 71, cpy: 35, x: 76, y: 38},
            {type: "L", x: 76, y: 39},
            {type: "Q", cpx: 72, cpy: 36, x: 67, y: 39},
            {type: "Q", cpx: 64, cpy: 42, x: 66, y: 45},
            {type: "Q", cpx: 69, cpy: 47, x: 72, y: 46},
            {type: "Q", cpx: 74, cpy: 44, x: 73, y: 42},
            {type: "Q", cpx: 72, cpy: 41, x: 70, y: 42},
            {type: "Z"}
        ]
    },
    {
        name: "anger_vein_cross",
        displayName: "💢 Anger Vein",
        category: "emotion",
        path: [
            {type: "M", x: 47, y: 25}, {type: "L", x: 53, y: 25},
            {type: "L", x: 53, y: 48}, {type: "L", x: 47, y: 48}, {type: "Z"},
            {type: "M", x: 25, y: 44}, {type: "L", x: 48, y: 44},
            {type: "L", x: 48, y: 50}, {type: "L", x: 25, y: 50}, {type: "Z"},
            {type: "M", x: 57, y: 35}, {type: "L", x: 62, y: 35},
            {type: "L", x: 62, y: 38}, {type: "L", x: 57, y: 38}, {type: "Z"},
            {type: "M", x: 35, y: 54}, {type: "L", x: 38, y: 54},
            {type: "L", x: 38, y: 59}, {type: "L", x: 35, y: 59}, {type: "Z"},
            {type: "M", x: 38, y: 29}, {type: "L", x: 41, y: 29},
            {type: "L", x: 41, y: 34}, {type: "L", x: 38, y: 34}, {type: "Z"},
            {type: "M", x: 59, y: 54}, {type: "L", x: 62, y: 54},
            {type: "L", x: 62, y: 59}, {type: "L", x: 59, y: 59}, {type: "Z"}
        ]
    },
    {
        name: "heart_eyes",
        displayName: "😍 Heart Eyes",
        category: "emotion",
        path: [
            {type: "M", x: 30, y: 35},
            {type: "Q", cpx: 25, cpy: 32, x: 23, y: 38},
            {type: "Q", cpx: 23, cpy: 43, x: 30, y: 48},
            {type: "Q", cpx: 37, cpy: 43, x: 37, y: 38},
            {type: "Q", cpx: 35, cpy: 32, x: 30, y: 35},
            {type: "Z"},
            {type: "M", x: 70, y: 35},
            {type: "Q", cpx: 65, cpy: 32, x: 63, y: 38},
            {type: "Q", cpx: 63, cpy: 43, x: 70, y: 48},
            {type: "Q", cpx: 77, cpy: 43, x: 77, y: 38},
            {type: "Q", cpx: 75, cpy: 32, x: 70, y: 35},
            {type: "Z"}
        ]
    },
    {
        name: "steam_puff",
        displayName: "💨 Steam Puff",
        category: "emotion",
        path: [
            {type: "M", x: 25, y: 30},
            {type: "Q", cpx: 22, cpy: 25, x: 25, y: 20},
            {type: "Q", cpx: 30, cpy: 18, x: 35, y: 22},
            {type: "Q", cpx: 38, cpy: 25, x: 35, y: 30},
            {type: "Q", cpx: 30, cpy: 32, x: 25, y: 30},
            {type: "Z"},
            {type: "M", x: 50, y: 25},
            {type: "Q", cpx: 47, cpy: 20, x: 50, y: 15},
            {type: "Q", cpx: 55, cpy: 13, x: 60, y: 17},
            {type: "Q", cpx: 63, cpy: 20, x: 60, y: 25},
            {type: "Q", cpx: 55, cpy: 27, x: 50, y: 25},
            {type: "Z"},
            {type: "M", x: 75, y: 30},
            {type: "Q", cpx: 72, cpy: 25, x: 75, y: 20},
            {type: "Q", cpx: 80, cpy: 18, x: 85, y: 22},
            {type: "Q", cpx: 88, cpy: 25, x: 85, y: 30},
            {type: "Q", cpx: 80, cpy: 32, x: 75, y: 30},
            {type: "Z"}
        ]
    },
    {
        name: "tear_streams",
        displayName: "😭 Tear Streams",
        category: "emotion",
        path: [
            {type: "M", x: 30, y: 30},
            {type: "Q", cpx: 28, cpy: 40, x: 30, y: 50},
            {type: "Q", cpx: 32, cpy: 60, x: 28, y: 70},
            {type: "L", x: 32, y: 70},
            {type: "Q", cpx: 34, cpy: 60, x: 32, y: 50},
            {type: "Q", cpx: 30, cpy: 40, x: 32, y: 30},
            {type: "Z"},
            {type: "M", x: 25, y: 75}, {type: "Q", cpx: 23, cpy: 73, x: 25, y: 71},
            {type: "Q", cpx: 27, cpy: 73, x: 25, y: 75}, {type: "Z"},
            {type: "M", x: 70, y: 30},
            {type: "Q", cpx: 68, cpy: 40, x: 70, y: 50},
            {type: "Q", cpx: 72, cpy: 60, x: 68, y: 70},
            {type: "L", x: 72, y: 70},
            {type: "Q", cpx: 74, cpy: 60, x: 72, y: 50},
            {type: "Q", cpx: 70, cpy: 40, x: 72, y: 30},
            {type: "Z"},
            {type: "M", x: 65, y: 75}, {type: "Q", cpx: 63, cpy: 73, x: 65, y: 71},
            {type: "Q", cpx: 67, cpy: 73, x: 65, y: 75}, {type: "Z"}
        ]
    },
    {
        name: "multiple_exclamations",
        displayName: "❗❗ Multiple !!!",
        category: "emotion",
        path: [
            {type: "M", x: 28, y: 20}, {type: "L", x: 33, y: 20}, {type: "L", x: 31, y: 55}, {type: "L", x: 30, y: 55}, {type: "Z"},
            {type: "M", x: 28, y: 62}, {type: "L", x: 33, y: 62}, {type: "L", x: 33, y: 67}, {type: "L", x: 28, y: 67}, {type: "Z"},
            {type: "M", x: 48, y: 15}, {type: "L", x: 53, y: 15}, {type: "L", x: 51, y: 50}, {type: "L", x: 50, y: 50}, {type: "Z"},
            {type: "M", x: 48, y: 57}, {type: "L", x: 53, y: 57}, {type: "L", x: 53, y: 62}, {type: "L", x: 48, y: 62}, {type: "Z"},
            {type: "M", x: 68, y: 20}, {type: "L", x: 73, y: 20}, {type: "L", x: 71, y: 55}, {type: "L", x: 70, y: 55}, {type: "Z"},
            {type: "M", x: 68, y: 62}, {type: "L", x: 73, y: 62}, {type: "L", x: 73, y: 67}, {type: "L", x: 68, y: 67}, {type: "Z"}
        ]
    },

    // Additional Impact & Comic Shapes
    {
        name: "explosion_burst",
        displayName: "💥 Explosion Burst",
        category: "impact",
        path: [
            {type: "M", x: 50, y: 30},
            {type: "Q", cpx: 60, cpy: 30, x: 60, y: 40},
            {type: "Q", cpx: 60, cpy: 50, x: 50, y: 50},
            {type: "Q", cpx: 40, cpy: 50, x: 40, y: 40},
            {type: "Q", cpx: 40, cpy: 30, x: 50, y: 30},
            {type: "Z"},
            {type: "M", x: 50, y: 10}, {type: "L", x: 45, y: 30}, {type: "L", x: 55, y: 30}, {type: "Z"},
            {type: "M", x: 75, y: 20}, {type: "L", x: 60, y: 35}, {type: "L", x: 65, y: 40}, {type: "Z"},
            {type: "M", x: 90, y: 40}, {type: "L", x: 60, y: 37}, {type: "L", x: 60, y: 43}, {type: "Z"},
            {type: "M", x: 75, y: 65}, {type: "L", x: 58, y: 50}, {type: "L", x: 62, y: 48}, {type: "Z"},
            {type: "M", x: 50, y: 75}, {type: "L", x: 45, y: 50}, {type: "L", x: 55, y: 50}, {type: "Z"},
            {type: "M", x: 25, y: 65}, {type: "L", x: 38, y: 48}, {type: "L", x: 42, y: 50}, {type: "Z"},
            {type: "M", x: 10, y: 40}, {type: "L", x: 40, y: 37}, {type: "L", x: 40, y: 43}, {type: "Z"},
            {type: "M", x: 25, y: 20}, {type: "L", x: 35, y: 40}, {type: "L", x: 40, y: 35}, {type: "Z"}
        ]
    },
    {
        name: "crack_radial",
        displayName: "⚡ Radial Crack",
        category: "impact",
        path: [
            {type: "M", x: 50, y: 50},
            {type: "L", x: 52, y: 48}, {type: "L", x: 65, y: 25}, {type: "L", x: 68, y: 20},
            {type: "M", x: 50, y: 50}, {type: "L", x: 52, y: 50}, {type: "L", x: 75, y: 48}, {type: "L", x: 85, y: 45},
            {type: "M", x: 50, y: 50}, {type: "L", x: 53, y: 52}, {type: "L", x: 70, y: 70}, {type: "L", x: 75, y: 78},
            {type: "M", x: 50, y: 50}, {type: "L", x: 50, y: 54}, {type: "L", x: 48, y: 80}, {type: "L", x: 45, y: 90},
            {type: "M", x: 50, y: 50}, {type: "L", x: 47, y: 53}, {type: "L", x: 30, y: 68}, {type: "L", x: 22, y: 75},
            {type: "M", x: 50, y: 50}, {type: "L", x: 48, y: 51}, {type: "L", x: 25, y: 52}, {type: "L", x: 15, y: 53},
            {type: "M", x: 50, y: 50}, {type: "L", x: 48, y: 47}, {type: "L", x: 32, y: 28}, {type: "L", x: 28, y: 20},
            {type: "M", x: 50, y: 50}, {type: "L", x: 51, y: 46}, {type: "L", x: 53, y: 20}, {type: "L", x: 55, y: 10},
            {type: "M", x: 65, y: 25}, {type: "L", x: 72, y: 28},
            {type: "M", x: 75, y: 48}, {type: "L", x: 78, y: 55},
            {type: "M", x: 30, y: 68}, {type: "L", x: 25, y: 72}
        ]
    },
    {
        name: "shockwave_rings",
        displayName: "〰️ Shockwave Rings",
        category: "impact",
        path: [
            {type: "M", x: 60, y: 50},
            {type: "Q", cpx: 60, cpy: 55, x: 50, y: 55},
            {type: "Q", cpx: 40, cpy: 55, x: 40, y: 50},
            {type: "Q", cpx: 40, cpy: 45, x: 50, y: 45},
            {type: "Q", cpx: 60, cpy: 45, x: 60, y: 50},
            {type: "Z"},
            {type: "M", x: 70, y: 50},
            {type: "Q", cpx: 70, cpy: 60, x: 50, y: 60},
            {type: "Q", cpx: 30, cpy: 60, x: 30, y: 50},
            {type: "Q", cpx: 30, cpy: 40, x: 50, y: 40},
            {type: "Q", cpx: 70, cpy: 40, x: 70, y: 50},
            {type: "Z"},
            {type: "M", x: 80, y: 50},
            {type: "Q", cpx: 80, cpy: 65, x: 50, y: 65},
            {type: "Q", cpx: 20, cpy: 65, x: 20, y: 50},
            {type: "Q", cpx: 20, cpy: 35, x: 50, y: 35},
            {type: "Q", cpx: 80, cpy: 35, x: 80, y: 50},
            {type: "Z"},
            {type: "M", x: 90, y: 50},
            {type: "Q", cpx: 90, cpy: 70, x: 50, y: 70},
            {type: "Q", cpx: 10, cpy: 70, x: 10, y: 50},
            {type: "Q", cpx: 10, cpy: 30, x: 50, y: 30},
            {type: "Q", cpx: 90, cpy: 30, x: 90, y: 50}
        ]
    },
    {
        name: "splash_water",
        displayName: "💦 Water Splash",
        category: "impact",
        path: [
            {type: "M", x: 25, y: 45},
            {type: "Q", cpx: 22, cpy: 40, x: 20, y: 38},
            {type: "Q", cpx: 18, cpy: 36, x: 20, y: 34},
            {type: "Q", cpx: 22, cpy: 32, x: 25, y: 35},
            {type: "Q", cpx: 27, cpy: 38, x: 25, y: 45},
            {type: "Z"},
            {type: "M", x: 35, y: 30},
            {type: "Q", cpx: 32, cpy: 25, x: 30, y: 22},
            {type: "Q", cpx: 28, cpy: 19, x: 30, y: 17},
            {type: "Q", cpx: 33, cpy: 15, x: 37, y: 18},
            {type: "Q", cpx: 39, cpy: 22, x: 35, y: 30},
            {type: "Z"},
            {type: "M", x: 50, y: 20},
            {type: "Q", cpx: 46, cpy: 15, x: 45, y: 10},
            {type: "Q", cpx: 44, cpy: 5, x: 50, y: 5},
            {type: "Q", cpx: 56, cpy: 5, x: 55, y: 10},
            {type: "Q", cpx: 54, cpy: 15, x: 50, y: 20},
            {type: "Z"},
            {type: "M", x: 65, y: 30},
            {type: "Q", cpx: 61, cpy: 22, x: 63, y: 18},
            {type: "Q", cpx: 67, cpy: 15, x: 70, y: 17},
            {type: "Q", cpx: 72, cpy: 19, x: 70, y: 22},
            {type: "Q", cpx: 68, cpy: 25, x: 65, y: 30},
            {type: "Z"},
            {type: "M", x: 75, y: 45},
            {type: "Q", cpx: 73, cpy: 38, x: 75, y: 35},
            {type: "Q", cpx: 78, cpy: 32, x: 80, y: 34},
            {type: "Q", cpx: 82, cpy: 36, x: 80, y: 38},
            {type: "Q", cpx: 78, cpy: 40, x: 75, y: 45},
            {type: "Z"},
            {type: "M", x: 50, y: 60},
            {type: "L", x: 40, y: 55},
            {type: "Q", cpx: 35, cpy: 50, x: 35, y: 45},
            {type: "L", x: 42, y: 40}, {type: "L", x: 45, y: 35}, {type: "L", x: 50, y: 30},
            {type: "L", x: 55, y: 35}, {type: "L", x: 58, y: 40}, {type: "L", x: 65, y: 45},
            {type: "Q", cpx: 65, cpy: 50, x: 60, y: 55},
            {type: "L", x: 50, y: 60},
            {type: "Z"}
        ]
    },
    {
        name: "energy_aura_burst",
        displayName: "✨ Energy Aura",
        category: "impact",
        path: [
            {type: "M", x: 55, y: 50},
            {type: "Q", cpx: 55, cpy: 55, x: 50, y: 55},
            {type: "Q", cpx: 45, cpy: 55, x: 45, y: 50},
            {type: "Q", cpx: 45, cpy: 45, x: 50, y: 45},
            {type: "Q", cpx: 55, cpy: 45, x: 55, y: 50},
            {type: "Z"},
            {type: "M", x: 50, y: 15}, {type: "L", x: 48, y: 40}, {type: "L", x: 52, y: 40}, {type: "Z"},
            {type: "M", x: 70, y: 25}, {type: "L", x: 56, y: 46}, {type: "L", x: 58, y: 50}, {type: "Z"},
            {type: "M", x: 85, y: 50}, {type: "L", x: 60, y: 48}, {type: "L", x: 60, y: 52}, {type: "Z"},
            {type: "M", x: 70, y: 75}, {type: "L", x: 58, y: 50}, {type: "L", x: 56, y: 54}, {type: "Z"},
            {type: "M", x: 50, y: 85}, {type: "L", x: 48, y: 60}, {type: "L", x: 52, y: 60}, {type: "Z"},
            {type: "M", x: 30, y: 75}, {type: "L", x: 42, y: 50}, {type: "L", x: 44, y: 54}, {type: "Z"},
            {type: "M", x: 15, y: 50}, {type: "L", x: 40, y: 48}, {type: "L", x: 40, y: 52}, {type: "Z"},
            {type: "M", x: 30, y: 25}, {type: "L", x: 44, y: 46}, {type: "L", x: 42, y: 50}, {type: "Z"},
            {type: "M", x: 25, y: 35}, {type: "L", x: 23, y: 38}, {type: "L", x: 27, y: 38}, {type: "Z"},
            {type: "M", x: 75, y: 35}, {type: "L", x: 73, y: 38}, {type: "L", x: 77, y: 38}, {type: "Z"},
            {type: "M", x: 75, y: 65}, {type: "L", x: 73, y: 68}, {type: "L", x: 77, y: 68}, {type: "Z"},
            {type: "M", x: 25, y: 65}, {type: "L", x: 23, y: 68}, {type: "L", x: 27, y: 68}, {type: "Z"}
        ]
    },
    {
        name: "crack_lines_break",
        displayName: "💢 Break Lines",
        category: "comic",
        path: [
            {type: "M", x: 10, y: 45}, {type: "L", x: 35, y: 47}, {type: "L", x: 40, y: 50},
            {type: "L", x: 60, y: 48}, {type: "L", x: 65, y: 45}, {type: "L", x: 90, y: 47},
            {type: "M", x: 20, y: 35}, {type: "L", x: 45, y: 37}, {type: "L", x: 55, y: 35}, {type: "L", x: 80, y: 37},
            {type: "M", x: 15, y: 55}, {type: "L", x: 42, y: 58}, {type: "L", x: 58, y: 55}, {type: "L", x: 85, y: 58},
            {type: "M", x: 35, y: 37}, {type: "L", x: 33, y: 47},
            {type: "M", x: 50, y: 35}, {type: "L", x: 52, y: 48},
            {type: "M", x: 65, y: 37}, {type: "L", x: 67, y: 47},
            {type: "M", x: 40, y: 50}, {type: "L", x: 38, y: 58},
            {type: "M", x: 60, y: 48}, {type: "L", x: 63, y: 58},
            {type: "M", x: 30, y: 37}, {type: "L", x: 28, y: 32},
            {type: "M", x: 70, y: 37}, {type: "L", x: 73, y: 32}
        ]
    },
    {
        name: "thought_bubble_tail",
        displayName: "💭 Thought Bubble",
        category: "comic",
        path: [
            {type: "M", x: 70, y: 30},
            {type: "Q", cpx: 85, cpy: 30, x: 85, y: 40},
            {type: "Q", cpx: 85, cpy: 50, x: 70, y: 50},
            {type: "Q", cpx: 55, cpy: 50, x: 55, y: 40},
            {type: "Q", cpx: 55, cpy: 30, x: 70, y: 30},
            {type: "Z"},
            {type: "M", x: 42, y: 55},
            {type: "Q", cpx: 50, cpy: 55, x: 50, y: 62},
            {type: "Q", cpx: 50, cpy: 69, x: 42, y: 69},
            {type: "Q", cpx: 34, cpy: 69, x: 34, y: 62},
            {type: "Q", cpx: 34, cpy: 55, x: 42, y: 55},
            {type: "Z"},
            {type: "M", x: 25, y: 75},
            {type: "Q", cpx: 30, cpy: 75, x: 30, y: 80},
            {type: "Q", cpx: 30, cpy: 85, x: 25, y: 85},
            {type: "Q", cpx: 20, cpy: 85, x: 20, y: 80},
            {type: "Q", cpx: 20, cpy: 75, x: 25, y: 75},
            {type: "Z"}
        ]
    },
    {
        name: "speech_bubble_tail",
        displayName: "💬 Speech Bubble",
        category: "comic",
        path: [
            {type: "M", x: 60, y: 20},
            {type: "Q", cpx: 90, cpy: 20, x: 90, y: 35},
            {type: "L", x: 90, y: 50},
            {type: "Q", cpx: 90, cpy: 55, x: 85, y: 55},
            {type: "L", x: 60, y: 55},
            {type: "L", x: 52, y: 65},
            {type: "L", x: 55, y: 55},
            {type: "L", x: 40, y: 55},
            {type: "Q", cpx: 35, cpy: 55, x: 35, y: 50},
            {type: "L", x: 35, y: 35},
            {type: "Q", cpx: 35, cpy: 20, x: 40, y: 20},
            {type: "L", x: 60, y: 20},
            {type: "Z"}
        ]
    }
];

// Explicitly expose to global scope for canvas.js to access
window.ForgeCanvasShapes = ForgeCanvasShapes;
