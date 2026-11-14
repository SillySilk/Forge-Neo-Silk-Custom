import os

import gradio as gr

from modules import script_callbacks

# CUSTOM (Forge Neo): character library routes
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from lib_json_builder.characters import CharacterError, CharacterNotFound, CharacterStore

CHARACTERS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "characters")


def builder_ui():
    return [(gr.Blocks(), "JSON Builder", "sd-forge-json-builder")]


script_callbacks.on_ui_tabs(builder_ui)


class FileBody(BaseModel):
    name: str


class SaveBody(BaseModel):
    name: str
    abbr: str
    full_name: str
    description: str


class DeleteBody(BaseModel):
    name: str
    abbr: str


class ImportBody(BaseModel):
    name: str
    content: str


def _call(fn, *args):
    try:
        return fn(*args)
    except CharacterNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CharacterError as e:
        raise HTTPException(status_code=400, detail=str(e))


def characters_api(_demo: gr.Blocks, app: FastAPI):
    store = CharacterStore(CHARACTERS_DIR)
    base = "/json_builder/characters"

    @app.get(f"{base}/files")
    def list_files():
        return {"files": _call(store.list_files)}

    @app.get(f"{base}/file")
    def read_file(name: str):
        return _call(store.read, name)

    @app.post(f"{base}/file")
    def create_file(body: FileBody):
        return _call(store.create, body.name)

    @app.post(f"{base}/save")
    def save_character(body: SaveBody):
        return _call(store.save_character, body.name, body.abbr, body.full_name, body.description)

    @app.post(f"{base}/delete")
    def delete_character(body: DeleteBody):
        return _call(store.delete_character, body.name, body.abbr)

    @app.post(f"{base}/import")
    def import_file(body: ImportBody):
        return _call(store.import_file, body.name, body.content)


script_callbacks.on_app_started(characters_api)
