"""Public identity for reader sharing; private renders never advertise a route."""
from html import escape
from pathlib import Path
import re

_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_WW = re.compile(r"ch([0-9]+)-act([0-9]+(?:-[0-9]+)*)")


def public_share_url(work_id: str, unit_id: str) -> str:
    if work_id == 'templates':
        raise ValueError('templates is a reserved reader namespace')
    if not isinstance(work_id, str) or not isinstance(unit_id, str) or len(work_id) > 120 or len(unit_id) > 120 or not _ID.fullmatch(work_id) or not _ID.fullmatch(unit_id):
        raise ValueError("Share identity must use stable work/unit ids")
    match = _WW.fullmatch(unit_id) if work_id == "wutheringwaves" else None
    path = f"ww-{match[1]}-{match[2]}" if match else ""
    if not path or len(path) == 22:
        path = f"elio/{work_id}/{unit_id}"
    return "https://s.ttaem.com/" + path


def render_reader_share(work_id: str, unit_id: str, *, public: bool) -> str:
    url = public_share_url(work_id, unit_id) if public else ""
    state = '' if public else ' disabled title="공개한 뒤 공유할 수 있어요"'
    return (
        '<span class="reader-share" translate="no" hidden>'
        f'<button id="story-share-button" class="reader-share__button" type="button" data-share-url="{escape(url, quote=True)}"{state}>'
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/></svg>'
        '<span data-share-label>공유</span></button>'
        '<span id="story-share-status" class="reader-share__status" role="status" aria-live="polite"></span></span>'
    )


def install_public_share(page: str, work_id: str, unit_id: str) -> str:
    """Upgrade a saved approved reader without reserializing its story or sources."""
    control = render_reader_share(work_id, unit_id, public=True)
    if 'id="story-share-button"' in page:
        expected = f'data-share-url="{public_share_url(work_id, unit_id)}"'
        if expected not in page:
            raise ValueError("Saved reader has another share identity")
        return page
    toolbar = re.compile(r'(<div\b[^>]*class="hero-tools"[^>]*>)(.*?)(</div>)', re.S)
    if len(toolbar.findall(page)) != 1:
        raise ValueError("Saved reader needs one existing reading toolbar")
    return toolbar.sub(lambda match: match[0] + control, page, count=1)


def install_retained_share_runtime(page: str) -> str:
    """Add the same component to a frozen reader with an older inline bundle."""
    if 'id="elio-reader-share-runtime"' in page or 'function shareUrl(base, current,' in page:
        return page
    root = Path(__file__).parent
    style = '<style id="elio-reader-share-style">' + (root / 'reader_share.css').read_text(encoding='utf-8') + '</style>'
    script = '<script id="elio-reader-share-runtime">' + (root / 'reader_share.js').read_text(encoding='utf-8') + '</script>'
    if page.count('</head>') != 1 or page.count('</body>') != 1:
        raise ValueError('Retained reader needs one document head and body')
    return page.replace('</head>', style + '</head>', 1).replace('</body>', script + '</body>', 1)
