"""Opens a new reading note file"""
# pylint: disable=consider-using-f-string
import glob
import os
import re
import string

RE_PUNCTUATION = re.compile(
    '[{}]+'.format(re.escape(string.punctuation + ' '))
)
TARGET_DIR = os.path.join("source", "17_notes")

print('Enter the title: ')
title = input('Enter the title: ')
url = input('Enter the URL: ')
suffix = RE_PUNCTUATION.sub('_', title.lower()) + '.md'
existing_files = glob.glob(os.path.join(TARGET_DIR, "*.md"))
indexes = {os.path.basename(filename)[:2] for filename in existing_files}
next_index = "{:02}".format(int(max(indexes), 10) + 1)
result = os.path.join(TARGET_DIR, f"{next_index}-{suffix}")
with open(result, 'wt', encoding='utf-8') as fobj:
    fobj.write(f'# {title}\n\n')
    fobj.write(f'Article: <{url}>\n\n')
    fobj.write('## Notes\n\n')
    fobj.write('## Conclusion\n\n')
    fobj.write('## Links to follow\n\n')
os.system(f'vi {result}')
