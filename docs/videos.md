# Video

> Reboot recipes apply until the next reload — `artsLightboxPlayground.reboot()` (no arguments) resets to defaults immediately.

The typical case: an autoplaying muted background video that opens into the
lightbox **without restarting** — the page element itself is adopted, flies
into place live, and keeps its playhead. The sound button in the chrome
enables audio; at most one video is ever unmuted, and closing hands the
element back muted, with its parallax intact. Videos are fit-only — zoom
and explore stay image features.

<script setup>
import videoBackground from './demos/video-background.html?raw'
import videoLinks from './demos/video-links.html?raw'
</script>

<LightboxDemo :html="videoBackground" />

<<< @/demos/video-background.html

Three source tiers, resolved automatically per slide:

1. **Adopt** — the page `<video>` is genuinely visible: it is moved into the
   lightbox (playback never pauses) and moved back on close.
2. **Clone and seek** — a `<video>` exists but is hidden (a WebGL texture
   source): a fresh player starts at the live playhead.
3. **Cold player** — no page element: plain video links build a native
   player; YouTube/Vimeo URLs build a controllable embed.

## Video links

Anchor candidates carry watch intent: the opened slide autoplays with sound.
Neighbors always load paused — swiping to them starts playback, swiping away
pauses it. Every common YouTube/Vimeo URL form is understood, including
timestamps and unlisted-video hashes.

<LightboxDemo :html="videoLinks" />

<<< @/demos/video-links.html

```js
// never autoplay, even on the opened slide
artsLightboxPlayground.reboot({ video: { autoplay: false } })
```

Per-element opt-out: `data-arts-lightbox-autoplay="false"` on the candidate.
