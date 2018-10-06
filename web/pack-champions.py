import os
import json

CHAMPS_DIR = "../champs"
OUT_FILE = "./src/champions.ts"

champions = {
    filename[:-2]: open(f'{dirpath}/{filename}').read()
    for (dirpath, _, files) in os.walk(CHAMPS_DIR)
    for filename in files
    if filename.endswith('.s')
}

champion_data = json.dumps(champions, sort_keys=True, indent=2)
js_code = f'export const champions = {champion_data}'

open(OUT_FILE, 'w').write(js_code)
