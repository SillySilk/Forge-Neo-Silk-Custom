# CUSTOM (Forge Neo): character library for the JSON Builder.
# A .jbcast file is JSON: {"version": 1, "characters": [{"abbr", "name", "description"}]},
# plus an optional "example": true that makes the file read-only.
import json
import os
import re
import tempfile

EXT = ".jbcast"
VERSION = 1
ABBR_RE = re.compile(r"^[A-Za-z0-9]{1,5}$")
NAME_RE = re.compile(r"^[A-Za-z0-9 _-]{1,64}$")
CHAR_KEYS = {"abbr", "name", "description"}


class CharacterError(Exception):
    """A problem the user can fix; the message is shown to them."""


class CharacterNotFound(CharacterError):
    """A missing file or abbreviation."""


def normalize_name(name: str) -> str:
    name = (name or "").strip()
    if name.lower().endswith(EXT):
        name = name[: -len(EXT)].strip()
    if not NAME_RE.match(name):
        raise CharacterError("File names may use letters, digits, spaces, '-' and '_' (1-64 characters).")
    return name + EXT


def _clean(text) -> str:
    return " ".join(text.split()) if isinstance(text, str) else ""


def _check_character(c: dict) -> dict:
    abbr = _clean(c.get("abbr"))
    if not ABBR_RE.match(abbr):
        raise CharacterError(f"Abbreviation '{abbr}' must be 1-5 letters or digits.")
    name = _clean(c.get("name"))
    if not name:
        raise CharacterError(f"{abbr}: the full name is empty.")
    description = _clean(c.get("description"))
    if not description:
        raise CharacterError(f"{abbr}: the description is empty.")
    return {"abbr": abbr, "name": name, "description": description}


def validate_cast(data) -> dict:
    """Return a cleaned copy of a cast file's content, or raise CharacterError."""
    if not isinstance(data, dict):
        raise CharacterError("Not a character file.")
    unknown = set(data) - {"version", "example", "characters"}
    if unknown:
        raise CharacterError(f"Unknown fields: {', '.join(sorted(unknown))}.")
    if data.get("version") != VERSION:
        raise CharacterError(f"Unsupported version {data.get('version')!r} (expected {VERSION}).")
    example = data.get("example", False)
    if not isinstance(example, bool):
        raise CharacterError("'example' must be true or false.")
    chars = data.get("characters")
    if not isinstance(chars, list):
        raise CharacterError("'characters' must be a list.")
    cleaned, seen = [], set()
    for c in chars:
        if not isinstance(c, dict) or set(c) != CHAR_KEYS:
            raise CharacterError("Each character needs exactly abbr, name and description.")
        c = _check_character(c)
        key = c["abbr"].lower()
        if key in seen:
            raise CharacterError(f"Abbreviation {c['abbr']} is used twice.")
        seen.add(key)
        cleaned.append(c)
    return {"version": VERSION, "example": example, "characters": cleaned}


class CharacterStore:
    def __init__(self, folder: str):
        self.folder = folder

    def _path(self, file_name: str) -> str:
        return os.path.join(self.folder, file_name)

    def list_files(self) -> list[str]:
        if not os.path.isdir(self.folder):
            raise CharacterError(f"Character folder is missing: {self.folder}")
        names = [n for n in os.listdir(self.folder) if n.lower().endswith(EXT) and os.path.isfile(self._path(n))]
        return sorted(names, key=str.lower)

    def _load(self, file_name: str) -> dict:
        path = self._path(file_name)
        if not os.path.isfile(path):
            raise CharacterNotFound(f"{file_name} does not exist.")
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError) as e:
            raise CharacterError(f"{file_name} could not be read: {e}") from e
        try:
            return validate_cast(data)
        except CharacterError as e:
            raise CharacterError(f"{file_name}: {e}") from e

    def _write(self, file_name: str, data: dict) -> None:
        out = {"version": VERSION, "characters": data["characters"]}
        if data.get("example"):
            out = {"version": VERSION, "example": True, "characters": data["characters"]}
        fd, tmp = tempfile.mkstemp(dir=self.folder, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
                json.dump(out, f, indent=2, ensure_ascii=False)
                f.write("\n")
            os.replace(tmp, self._path(file_name))
        except BaseException:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise

    @staticmethod
    def _view(file_name: str, data: dict) -> dict:
        return {"name": file_name, "example": data["example"], "characters": data["characters"]}

    def _writable(self, file_name: str) -> dict:
        data = self._load(file_name)
        if data["example"]:
            raise CharacterError("Examples are read-only. Use New file to make your own.")
        return data

    def read(self, name: str) -> dict:
        file_name = normalize_name(name)
        return self._view(file_name, self._load(file_name))

    def create(self, name: str) -> dict:
        file_name = normalize_name(name)
        if os.path.exists(self._path(file_name)):
            raise CharacterError(f"{file_name} already exists.")
        data = {"version": VERSION, "example": False, "characters": []}
        self._write(file_name, data)
        return self._view(file_name, data)

    def save_character(self, name: str, abbr: str, full_name: str, description: str) -> dict:
        file_name = normalize_name(name)
        data = self._writable(file_name)
        new = _check_character({"abbr": abbr, "name": full_name, "description": description})
        chars = data["characters"]
        for i, c in enumerate(chars):
            if c["abbr"].lower() == new["abbr"].lower():
                chars[i] = new
                break
        else:
            chars.append(new)
        self._write(file_name, data)
        return self._view(file_name, data)

    def delete_character(self, name: str, abbr: str) -> dict:
        file_name = normalize_name(name)
        data = self._writable(file_name)
        key = _clean(abbr).lower()
        kept = [c for c in data["characters"] if c["abbr"].lower() != key]
        if len(kept) == len(data["characters"]):
            raise CharacterNotFound(f"{_clean(abbr)} is not in {file_name}.")
        data["characters"] = kept
        self._write(file_name, data)
        return self._view(file_name, data)

    def import_file(self, name: str, content: str) -> dict:
        file_name = normalize_name(name)
        if os.path.exists(self._path(file_name)):
            raise CharacterError(f"{file_name} already exists. Rename the file before importing.")
        try:
            raw = json.loads(content)
        except (TypeError, ValueError) as e:
            raise CharacterError(f"Not a valid character file: {e}") from e
        data = validate_cast(raw)
        data["example"] = False
        self._write(file_name, data)
        return self._view(file_name, data)
