/**
 * Shapes Library - Built-in shape definitions for ForgeCanvas
 *
 * Shapes are defined in a normalized 100x100 coordinate system
 * Path format: array of {type, x, y} objects where:
 *   - type: "M" (move), "L" (line), "Q" (quadratic curve), "Z" (close)
 *   - x, y: coordinates in 100x100 space
 */

export class ShapesLibrary {
    constructor() {
        this.shapes = this._getBuiltInShapes();
    }

    /**
     * Get all built-in shapes
     * @returns {Array} Array of shape objects
     */
    getAllShapes() {
        return this.shapes;
    }

    /**
     * Get shapes by category
     * @param {string} category - Category name (basic, stars, arrows, etc.)
     * @returns {Array} Filtered array of shapes
     */
    getByCategory(category) {
        return this.shapes.filter(s => s.category === category);
    }

    /**
     * Get shape by name
     * @param {string} name - Shape name
     * @returns {Object|null} Shape object or null
     */
    getByName(name) {
        return this.shapes.find(s => s.name === name) || null;
    }

    /**
     * Get all unique categories
     * @returns {Array} Array of category names
     */
    getCategories() {
        return [...new Set(this.shapes.map(s => s.category))];
    }

    /**
     * Built-in shape definitions (reduced to 6 essential comic effects)
     * @private
     */
    _getBuiltInShapes() {
        return [
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
                name: "explosion_lines",
                displayName: "💣 Explosion",
                category: "comic",
                path: [
                    {type: "M", x: 50, y: 15},
                    {type: "L", x: 55, y: 35},
                    {type: "L", x: 50, y: 40},
                    {type: "L", x: 45, y: 35},
                    {type: "Z"},
                    {type: "M", x: 75, y: 25},
                    {type: "L", x: 60, y: 40},
                    {type: "L", x: 55, y: 38},
                    {type: "L", x: 58, y: 33},
                    {type: "Z"},
                    {type: "M", x: 85, y: 50},
                    {type: "L", x: 65, y: 50},
                    {type: "L", x: 63, y: 45},
                    {type: "L", x: 65, y: 40},
                    {type: "Z"},
                    {type: "M", x: 75, y: 75},
                    {type: "L", x: 60, y: 60},
                    {type: "L", x: 58, y: 63},
                    {type: "L", x: 55, y: 68},
                    {type: "Z"},
                    {type: "M", x: 50, y: 85},
                    {type: "L", x: 55, y: 65},
                    {type: "L", x: 50, y: 60},
                    {type: "L", x: 45, y: 65},
                    {type: "Z"},
                    {type: "M", x: 25, y: 75},
                    {type: "L", x: 40, y: 60},
                    {type: "L", x: 42, y: 63},
                    {type: "L", x: 45, y: 68},
                    {type: "Z"},
                    {type: "M", x: 15, y: 50},
                    {type: "L", x: 35, y: 50},
                    {type: "L", x: 37, y: 45},
                    {type: "L", x: 35, y: 40},
                    {type: "Z"},
                    {type: "M", x: 25, y: 25},
                    {type: "L", x: 40, y: 40},
                    {type: "L", x: 42, y: 38},
                    {type: "L", x: 45, y: 33},
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
            {
                name: "dizzy_stars",
                displayName: "😵 Dizzy Stars",
                category: "comic",
                path: [
                    {type: "M", x: 50, y: 35}, {type: "L", x: 65, y: 38}, {type: "L", x: 75, y: 45}, {type: "L", x: 75, y: 55}, {type: "L", x: 65, y: 62}, {type: "L", x: 50, y: 65}, {type: "L", x: 35, y: 62}, {type: "L", x: 25, y: 55}, {type: "L", x: 25, y: 45}, {type: "L", x: 35, y: 38}, {type: "Z"},
                    {type: "M", x: 35, y: 50}, {type: "L", x: 38, y: 35}, {type: "L", x: 45, y: 25}, {type: "L", x: 55, y: 25}, {type: "L", x: 62, y: 35}, {type: "L", x: 65, y: 50}, {type: "L", x: 62, y: 65}, {type: "L", x: 55, y: 75}, {type: "L", x: 45, y: 75}, {type: "L", x: 38, y: 65}, {type: "Z"},
                    {type: "M", x: 50, y: 8}, {type: "L", x: 52, y: 13}, {type: "L", x: 57, y: 13}, {type: "L", x: 53, y: 16}, {type: "L", x: 55, y: 21}, {type: "L", x: 50, y: 18}, {type: "L", x: 45, y: 21}, {type: "L", x: 47, y: 16}, {type: "L", x: 43, y: 13}, {type: "L", x: 48, y: 13}, {type: "Z"},
                    {type: "M", x: 85, y: 50}, {type: "L", x: 87, y: 52}, {type: "L", x: 92, y: 52}, {type: "L", x: 88, y: 55}, {type: "L", x: 90, y: 60}, {type: "L", x: 85, y: 57}, {type: "L", x: 80, y: 60}, {type: "L", x: 82, y: 55}, {type: "L", x: 78, y: 52}, {type: "L", x: 83, y: 52}, {type: "Z"},
                    {type: "M", x: 50, y: 82}, {type: "L", x: 52, y: 87}, {type: "L", x: 57, y: 87}, {type: "L", x: 53, y: 90}, {type: "L", x: 55, y: 95}, {type: "L", x: 50, y: 92}, {type: "L", x: 45, y: 95}, {type: "L", x: 47, y: 90}, {type: "L", x: 43, y: 87}, {type: "L", x: 48, y: 87}, {type: "Z"},
                    {type: "M", x: 15, y: 50}, {type: "L", x: 17, y: 52}, {type: "L", x: 22, y: 52}, {type: "L", x: 18, y: 55}, {type: "L", x: 20, y: 60}, {type: "L", x: 15, y: 57}, {type: "L", x: 10, y: 60}, {type: "L", x: 12, y: 55}, {type: "L", x: 8, y: 52}, {type: "L", x: 13, y: 52}, {type: "Z"},
                    {type: "M", x: 72, y: 28}, {type: "L", x: 74, y: 30}, {type: "L", x: 79, y: 30}, {type: "L", x: 75, y: 33}, {type: "L", x: 77, y: 38}, {type: "L", x: 72, y: 35}, {type: "L", x: 67, y: 38}, {type: "L", x: 69, y: 33}, {type: "L", x: 65, y: 30}, {type: "L", x: 70, y: 30}, {type: "Z"}
                ]
            }
        ];
    }
}
