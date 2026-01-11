"""Opens the right life file and prepolates it with the today's date"""
# pylint: disable=consider-using-f-string
import datetime
import os

LIFE_DIR = os.path.join("source", "16_life")

today = datetime.date.today()
name = today.strftime("%Y-%m.md")
result = os.path.join(LIFE_DIR, name)
content: str = ''
if os.path.exists(result):
    with open(result, "rt", encoding="utf-8") as fp:
        content = fp.read()
with open(result, "wt", encoding="utf-8") as fp:
    header = today.strftime("%b %d, %Y")
    fp.write(f"`{header}` - \n\n")
    fp.write(content)
print(result)
