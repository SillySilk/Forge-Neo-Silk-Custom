# CUSTOM (Forge Neo): compatibility shim.
# Upstream renamed A1111's `modules.generation_parameters_copypaste` to
# `modules.infotext_utils` (June 2026 merge). Many third-party extensions still
# import the old name (e.g. sd-dynamic-prompts, forge2_cleaner). Re-export the
# public API so they keep working without editing each extension.
from modules.infotext_utils import *  # noqa: F401,F403
from modules.infotext_utils import (  # noqa: F401  (explicit: names extensions rely on)
    ParamBinding,
    parse_generation_parameters,
    register_paste_params_button,
)
