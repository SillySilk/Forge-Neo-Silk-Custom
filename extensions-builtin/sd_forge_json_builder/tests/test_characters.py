# CUSTOM (Forge Neo): character library store tests. Run with the venv python, no pytest needed.
import json
import os
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib_json_builder.characters import CharacterError, CharacterNotFound, CharacterStore, normalize_name  # noqa: E402


def write(folder, name, data):
    with open(os.path.join(folder, name), "w", encoding="utf-8") as f:
        f.write(data if isinstance(data, str) else json.dumps(data))


def cast(*chars, **extra):
    return {"version": 1, "characters": [{"abbr": a, "name": n, "description": d} for a, n, d in chars], **extra}


class StoreTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name
        self.store = CharacterStore(self.dir)

    def tearDown(self):
        self._tmp.cleanup()

    def test_normalize_name(self):
        self.assertEqual(normalize_name("my cast"), "my cast.jbcast")
        self.assertEqual(normalize_name("my cast.jbcast"), "my cast.jbcast")
        for bad in ["../x", "a/b", "a\\b", "", "   ", "x" * 65]:
            with self.assertRaises(CharacterError, msg=bad):
                normalize_name(bad)

    def test_create_and_list(self):
        self.store.create("b")
        self.store.create("A")
        write(self.dir, "notes.txt", "x")
        self.assertEqual(self.store.list_files(), ["A.jbcast", "b.jbcast"])
        with self.assertRaises(CharacterError):
            self.store.create("b")
        self.assertEqual(self.store.read("b"), {"name": "b.jbcast", "example": False, "characters": []})

    def test_save_and_upsert(self):
        self.store.create("c")
        self.store.save_character("c", "LS", "Lisa Simpson", "star hair")
        result = self.store.save_character("c", "ls", "Lisa S.", "pink dress")
        self.assertEqual(result["characters"], [{"abbr": "ls", "name": "Lisa S.", "description": "pink dress"}])

    def test_save_validates(self):
        self.store.create("c")
        for abbr in ["", "ABCDEF", "L S", "L-S"]:
            with self.assertRaises(CharacterError, msg=abbr):
                self.store.save_character("c", abbr, "Name", "desc")
        with self.assertRaises(CharacterError):
            self.store.save_character("c", "LS", "  ", "desc")
        with self.assertRaises(CharacterError):
            self.store.save_character("c", "LS", "Name", "\n ")
        self.assertEqual(self.store.read("c")["characters"], [])

    def test_save_missing_file(self):
        with self.assertRaises(CharacterNotFound):
            self.store.save_character("nope", "LS", "Name", "desc")

    def test_save_collapses_whitespace(self):
        self.store.create("c")
        result = self.store.save_character("c", " LS ", "  Lisa  ", "a\n\tb   c ")
        self.assertEqual(result["characters"], [{"abbr": "LS", "name": "Lisa", "description": "a b c"}])

    def test_save_rereads_file(self):
        self.store.create("c")
        self.store.save_character("c", "A1", "Anna", "one")
        write(self.dir, "c.jbcast", cast(("A1", "Anna", "one"), ("B2", "Ben", "two")))
        result = self.store.save_character("c", "C3", "Cleo", "three")
        self.assertEqual([c["abbr"] for c in result["characters"]], ["A1", "B2", "C3"])

    def test_delete(self):
        self.store.create("c")
        self.store.save_character("c", "LS", "Lisa", "x")
        self.store.save_character("c", "MB", "Marge", "y")
        result = self.store.delete_character("c", "ls")
        self.assertEqual([c["abbr"] for c in result["characters"]], ["MB"])
        with self.assertRaises(CharacterNotFound):
            self.store.delete_character("c", "LS")

    def test_example_read_only(self):
        write(self.dir, "ex.jbcast", cast(("MR", "Example: Mira", "x"), example=True))
        self.assertIs(self.store.read("ex")["example"], True)
        for call in (lambda: self.store.save_character("ex", "ZZ", "Z", "z"), lambda: self.store.delete_character("ex", "MR")):
            with self.assertRaises(CharacterError) as ctx:
                call()
            self.assertIn("New file", str(ctx.exception))

    def test_read_corrupt_file(self):
        write(self.dir, "bad.jbcast", "{not json")
        with self.assertRaises(CharacterError) as ctx:
            self.store.read("bad")
        self.assertIn("bad.jbcast", str(ctx.exception))

    def test_read_invalid_structure(self):
        write(self.dir, "bad.jbcast", cast(("L S", "Lisa", "x")))
        with self.assertRaises(CharacterError) as ctx:
            self.store.read("bad")
        self.assertIn("bad.jbcast", str(ctx.exception))

    def test_read_missing_file(self):
        with self.assertRaises(CharacterNotFound):
            self.store.read("nope")

    def test_list_ignores_content(self):
        write(self.dir, "bad.jbcast", "{not json")
        self.assertEqual(self.store.list_files(), ["bad.jbcast"])

    def test_import_ok(self):
        content = json.dumps(cast(("MR", "Example: Mira", "x"), example=True))
        result = self.store.import_file("mine", content)
        self.assertEqual(result, {"name": "mine.jbcast", "example": False, "characters": [{"abbr": "MR", "name": "Example: Mira", "description": "x"}]})
        with open(os.path.join(self.dir, "mine.jbcast"), encoding="utf-8") as f:
            self.assertNotIn("example", json.load(f))

    def test_import_rejects(self):
        self.store.create("taken")
        bad = [
            ("dup", json.dumps(cast(("LS", "Lisa", "x"), ("ls", "Lisa 2", "y")))),
            ("abbr", json.dumps(cast(("TOOLONG", "Lisa", "x")))),
            ("ver", json.dumps({"version": 2, "characters": []})),
            ("junk", "{not json"),
            ("taken", json.dumps(cast(("LS", "Lisa", "x")))),
        ]
        for name, content in bad:
            with self.assertRaises(CharacterError, msg=name):
                self.store.import_file(name, content)
        self.assertEqual(self.store.list_files(), ["taken.jbcast"])

    def test_shipped_examples_valid(self):
        data = CharacterStore(os.path.join(ROOT, "characters")).read("examples")
        self.assertIs(data["example"], True)
        self.assertEqual(len(data["characters"]), 2)
        self.assertTrue(all(c["name"].startswith("Example:") for c in data["characters"]))


if __name__ == "__main__":
    unittest.main()
