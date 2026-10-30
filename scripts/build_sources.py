"""Regenerate shared canonical templates in the browser source, or check them."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
for name in ['guides','reader','map']:
    subprocess.run([sys.executable,'-B',str(ROOT/'scripts'/('build_elio_'+name+'.py')),
                    *(['--check'] if '--check' in sys.argv else [])],cwd=ROOT,check=True)
