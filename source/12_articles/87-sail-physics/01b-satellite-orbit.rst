A satellite orbit calculated with RK4
-------------------------------------

To illustrate the integration method, let's see how it handles a satellite orbiting Earth.
The animation uses following parameters:

- The satellite starts at the closest distance to Earth at 8,000 km from center with initial speed of 9203 m/s.
- The playback multiplier is 4,333.
- The RK4 uses 2 seconds tick.
- At 60 frames/s this is about 36 ticks per frame.
- Earth is fixed and spherical, no Moon and no Sun.

.. raw:: html

    <iframe
      src="../../_static/orbit/index.html?embedded=1"
      title="Calculated elliptical satellite orbit with gravitational force, velocity and trajectory trace"
      width="100%" height="700"
      style="display:block;width:100%;height:700px;border:0;"
      loading="lazy">
    </iframe>
    <script>
      (() => {
        const frame = document.currentScript.previousElementSibling;
        const sendTheme = () => {
          const root = document.documentElement;
          const theme = getComputedStyle(root);
          frame.contentWindow.postMessage({
            type: 'orbit-theme',
            background: theme.getPropertyValue('--sy-c-background').trim(),
            text: theme.getPropertyValue('--sy-c-text').trim(),
            border: theme.getPropertyValue('--sy-c-heading').trim(),
            font: getComputedStyle(document.body).fontFamily,
            dark: root.classList.contains('dark')
          }, '*');
        };
        frame.addEventListener('load', sendTheme);
        window.addEventListener('message', event => {
          if (event.source !== frame.contentWindow) return;
          if (event.data?.type === 'orbit-ready') sendTheme();
          if (event.data?.type === 'orbit-size' && Number.isFinite(event.data.height)) {
            frame.style.height = Math.max(200, Math.min(1400, event.data.height)) + 'px';
          }
        });
        const observer = new MutationObserver(sendTheme);
        observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
        window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
      })();
    </script>
