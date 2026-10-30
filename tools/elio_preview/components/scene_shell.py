"""One scene shell shared by the canonical reader and the browser authoring adapter.

Callers own escaping, validated IDs and authored markup, as in the original render loop.
Replace tokens once so reader text containing a template token remains plain text.
"""
from pathlib import Path
import re

SCENE_SHELL = Path(__file__).with_suffix('.html').read_text(encoding='utf-8').rstrip('\n')


def render_scene_shell(*, ident, side, text_class, attributes, accent, contents, cover):
    values = dict(ID=ident, SIDE=side, TEXT_CLASS=text_class, ATTRIBUTES=attributes,
                  ACCENT=accent, CONTENTS=contents, COVER=cover)
    return re.sub(r'\{\{([A-Z_]+)\}\}', lambda match: values[match[1]], SCENE_SHELL)
