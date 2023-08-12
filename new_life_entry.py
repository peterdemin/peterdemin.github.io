"""Opens the right life file and prepolates it with the today's date"""
# pylint: disable=consider-using-f-string
import datetime
import glob
import os

LIFE_DIR = os.path.join("source", "16_life")

today = datetime.date.today()
suffix = today.strftime("%Y-%m.md")
matching_files = glob.glob(os.path.join(LIFE_DIR, f"??-{suffix}"))
if matching_files:
    result = matching_files[0]
else:
    existing_files = glob.glob(os.path.join(LIFE_DIR, "??-*.md"))
    indexes = {os.path.basename(filename)[:2] for filename in existing_files}
    indexes.discard("99")
    next_index = "{:2}".format(int(max(indexes), 10) + 1)
    result = os.path.join(LIFE_DIR, f"{next_index}-{suffix}")
with open(result, "rt", encoding="utf-8") as fp:
    content = fp.read()
with open(result, "wt", encoding="utf-8") as fp:
    header = today.strftime("%b %d, %Y")
    fp.write(f"`{header}` - \n\n")
    fp.write(content)
print(result)
