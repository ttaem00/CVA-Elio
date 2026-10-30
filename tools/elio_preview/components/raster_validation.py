"""Local raster validation shared by Elio rendering and image acquisition.

Pillow is optional until a caller supplies raster pixels for verification.
"""
import hashlib
import io
import warnings


MAX_IMAGE_BYTES = 8_000_000
MAX_PIXELS = 20_000_000
FORMATS = {'JPEG': ('image/jpeg', '.jpg'), 'PNG': ('image/png', '.png'),
           'WEBP': ('image/webp', '.webp')}


def verify_raster(raw: bytes) -> dict:
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError('Image byte limit exceeded')
    try:
        from PIL import Image
    except ImportError as error:
        raise RuntimeError(
            'Raster image verification requires Pillow. Install Pillow to use JPEG, PNG or WebP assets.'
        ) from error
    with warnings.catch_warnings():
        warnings.simplefilter('error', Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(raw)) as img:
            if img.format not in FORMATS:
                raise ValueError('Only JPEG, PNG and WebP raster images are supported')
            if img.width * img.height > MAX_PIXELS or min(img.size) < 1:
                raise ValueError('Image pixel limit exceeded')
            fmt, size = img.format, img.size
            if getattr(img, 'n_frames', 1) != 1:
                raise ValueError('Animated images are outside the initial asset contract')
            img.verify()
        with Image.open(io.BytesIO(raw)) as img:
            img.load()
    return {'format': fmt, 'width': size[0], 'height': size[1],
            'content_hash': hashlib.sha256(raw).hexdigest()}


def encode_webp(raw: bytes) -> bytes:
    """Encode a public rendition without changing the verified source bytes."""
    verify_raster(raw)
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image)
        has_alpha = image.mode in {'RGBA', 'LA'} or 'transparency' in image.info
        pixels = image.convert('RGBA' if has_alpha else 'RGB')
        output = io.BytesIO()
        options = {'quality': 85}
        if image.info.get('icc_profile') and image.mode != 'CMYK':
            options['icc_profile'] = image.info['icc_profile']
        pixels.save(output, format='WEBP', **options)
    encoded = output.getvalue()
    verify_raster(encoded)
    return encoded
