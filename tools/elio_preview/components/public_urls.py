"""Pure URL boundary shared by Elio evidence validation and source acquisition."""
import ipaddress
import re
from urllib.parse import urlparse, urlsplit


_ACCOUNT_URL = re.compile(
    r"(?P<prefix>https?://|//)(?:"
    r"(?P<pages>mizan0515\.github\.io)(?=[:/?#\s\"'<>)]|$)|"
    r"(?P<host>github\.com|raw\.githubusercontent\.com|cdn\.jsdelivr\.net/gh)"
    r"/mizan0515(?=[/?#\s\"'<>)]|$))",
    re.IGNORECASE,
)


def current_github_urls(text: str) -> str:
    """Project old GitHub account URLs; keep repository, revision, path, query and fragment verbatim."""
    def replace(match: re.Match) -> str:
        destination = "veil05.github.io" if match["pages"] else match["host"] + "/VEIL05"
        return match["prefix"] + destination

    return _ACCOUNT_URL.sub(replace, text)


def _is_public_ip(value: str) -> bool:
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return True
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def validate_public_url(url: str) -> str:
    """Validate the caller-provided URL without resolving or fetching it."""
    candidate = url.strip()
    parsed = urlsplit(candidate)
    if parsed.scheme != "https":
        raise ValueError("Elio source URL must use https")
    if not parsed.hostname:
        raise ValueError("Elio source URL must include a hostname")
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Elio source URL must be publicly reachable")
    if not _is_public_ip(hostname):
        raise ValueError("Elio source URL cannot target a private or reserved IP")
    if parsed.username or parsed.password:
        raise ValueError("Elio source URL cannot contain credentials")
    return candidate


def validate_public_media_url(value: str) -> str:
    """Accept one public HTTP(S) URL and reject credential/local network forms."""

    raw = str(value or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("one public http(s) video URL is required")
    if parsed.username or parsed.password:
        raise ValueError("credentials in media URLs are forbidden")
    host = parsed.hostname.casefold().rstrip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith(".local"):
        raise ValueError("local/private media hosts are forbidden")
    try:
        address = ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        address = None
    if address and not address.is_global:
        raise ValueError("local/private media addresses are forbidden")
    return raw
