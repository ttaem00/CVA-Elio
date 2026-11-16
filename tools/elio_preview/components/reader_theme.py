"""Story reader display mode: first-paint boot script and no-script palette copy.

The saved choice is a browser preference only. It never enters story data,
share URLs or hashes. The head boot runs before the reader stylesheet so an
explicit light/dark choice is honored from the first paint; without script the
device palette applies through ``prefers-color-scheme``.
"""

from __future__ import annotations

import re

STORAGE_KEY = "elio-reader-theme"
BOOT_ID = "elio-reader-theme-boot"
DARK_SCOPE = ":root[data-reader-theme=dark]"
# Script never ran (no attribute) and the page is a story reader (spoiler toggle).
NO_SCRIPT_SCOPE = ":root:not([data-reader-theme]):has(#spoiler-toggle)"
DARK_START = "/* reader-theme:dark:start */"
DARK_END = "/* reader-theme:dark:end */"

THEME_BOOT = (
    f'<script id="{BOOT_ID}">(function(){{var d=document.documentElement,m=null,s;'
    f'try{{m=window.localStorage.getItem("{STORAGE_KEY}")}}catch(e){{}}'
    'if(m!=="light"&&m!=="dark")m="system";s=m;'
    'if(m==="system"){try{s=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}'
    'catch(e){s="light"}}'
    'd.setAttribute("data-reader-theme-mode",m);d.setAttribute("data-reader-theme",s)})();</script>'
)

_BOOT_PATTERN = re.compile(r'<script id="' + BOOT_ID + r'">[\s\S]*?</script>')
_HEAD_PATTERN = re.compile(r'<head\b[^>]*>([\s\S]*?)</head>', re.I)
_STYLESHEET_PATTERN = re.compile(r'<style\b|<link\b[^>]*\brel=(["\'])stylesheet\1', re.I)


def no_script_styles(theme_css: str) -> str:
    """Return the dark block re-scoped to device preference when script is absent."""
    if theme_css.count(DARK_START) != 1 or theme_css.count(DARK_END) != 1:
        raise ValueError("reader theme dark block markers are missing or duplicated")
    start = theme_css.index(DARK_START) + len(DARK_START)
    end = theme_css.index(DARK_END)
    if end <= start or NO_SCRIPT_SCOPE in theme_css:
        raise ValueError("reader theme dark block is malformed")
    block = theme_css[start:end].strip().replace(DARK_SCOPE, NO_SCRIPT_SCOPE)
    return "@media (prefers-color-scheme:dark){\n" + block + "\n}"


def install_reader_theme_boot(document: str) -> str:
    """Place exactly one current boot script before the first head stylesheet.

    Idempotent: an existing boot is replaced in place. Fails closed when the
    document has no single head with a stylesheet, or already has duplicates.
    """
    existing = _BOOT_PATTERN.findall(document)
    if len(existing) > 1 or document.count(f'id="{BOOT_ID}"') != len(existing):
        raise ValueError("reader theme boot is duplicated or unrecognized")
    if existing:
        return _BOOT_PATTERN.sub(lambda _match: THEME_BOOT, document, count=1)
    heads = list(_HEAD_PATTERN.finditer(document))
    if len(heads) != 1:
        raise ValueError("reader document must have exactly one head")
    stylesheet = _STYLESHEET_PATTERN.search(heads[0].group(1))
    if not stylesheet:
        raise ValueError("reader document head has no stylesheet")
    position = heads[0].start(1) + stylesheet.start()
    return document[:position] + THEME_BOOT + document[position:]
