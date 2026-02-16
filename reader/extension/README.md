# Reader Capture Extension

Toolbar action captures HTML from the active tab, sends it to:

- `https://reader.demin.dev/api/render?base_url=<current tab URL>`

Then opens the rendered HTML in a new tab.

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
