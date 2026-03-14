import os
import glob

directory = 'd:/Watumull/hackverse-cybersecurity-wc01_bytedevs/frontend/app/api'

for root, _, files in os.walk(directory):
    for filename in files:
        if filename.endswith('.ts'):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'localhost:8000' in content:
                print(f'Replacing in {filepath}')
                content = content.replace('localhost:8000', 'localhost:8001')
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
