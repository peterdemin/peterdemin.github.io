# Reader Extension

Toolbar action captures HTML from the active tab, sends it to:

- `https://reader.demin.dev/api/render?base_url=<current tab URL>`

The backend stores rendered output under `/p/<hash-split>.html` and returns a shareable URL.
The extension updates the same tab to that URL.

Links inside rendered pages are also opened in reader mode:

1. Click link in reader output.
2. Extension opens a temporary background tab for that URL.
3. Extension captures HTML, sends it to reader API, closes temp tab.
4. Current tab updates to the new `/p/...` shareable reader URL.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this `extension/` directory.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select `manifest.json` from this directory.

## Convert for Safari (macOS)

```bash
xcrun safari-web-extension-converter reader/extension --no-open
```

Then open the generated Xcode project and run it.
