# Downloads fletora's fonts from Google Fonts (latin and latin-ext only) into public/fonts, and writes
# public/fonts/fonts.css with @font-face rules pointing at them.
import re, subprocess, os
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
FAM = 'family=Geist:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Caveat:wght@400;600&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Permanent+Marker&display=swap'
css = subprocess.run(['curl', '-sS', '-A', UA, 'https://fonts.googleapis.com/css2?' + FAM], capture_output=True, text=True).stdout
seen = {}
out = ['/* fletora\'s fonts, served from the site (all under the SIL Open Font License). Made by getfonts.py. */']
for block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
    subset, rule = block
    if subset not in ('latin', 'latin-ext'): continue
    fam = re.search(r"font-family: '([^']+)'", rule).group(1); style = re.search(r'font-style: (\w+)', rule).group(1); wt = re.search(r'font-weight: ([\d ]+)', rule).group(1).strip()
    url = re.search(r'url\((https://[^)]+)\)', rule).group(1)
    # One file per source: a variable font serves every weight from the same file.
    name = seen.get(url) or f"{fam.lower().replace(' ', '-')}{'' if url in seen else '-' + str(len(seen))}{'-italic' if style == 'italic' else ''}-{subset}.woff2"
    if url not in seen: subprocess.run(['curl', '-sS', url, '-o', f'public/fonts/{name}'], check=True); seen[url] = name
    out.append(rule.replace(url, f'/fonts/{name}'))
open('public/fonts/fonts.css', 'w').write('\n'.join(out) + '\n')
print(len(out) - 1, 'faces')
