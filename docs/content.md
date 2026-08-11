# Content types

Images, self-hosted video, YouTube/Vimeo embeds, and arbitrary HTML — all
first-class slide types in one gallery. Video plays on activation and pauses
the moment you swipe away. Video/html slides are fit-only (no zoom/explore)
and open with the backdrop only (no flight — there is no source image to
promote).

<script setup>
import mixedContent from './demos/mixed-content.html?raw'
import tallExplore from './demos/tall-explore.html?raw'
</script>

<LightboxDemo :html="mixedContent" />

<<< @/demos/mixed-content.html

## Explore mode

Enable, open the tall artwork, click to zoom in — then just **move** the
mouse. The pan glides toward the pointer, no dragging:

```js
artsLightboxPlayground.reboot({ explore: { enabled: true } })
```

<LightboxDemo :html="tallExplore" />

```js
// desktop zoom ergonomics that pair with it
artsLightboxPlayground.reboot({ zoom: { wheelToZoom: true } })
artsLightboxPlayground.reboot({ zoom: { imageClickAction: 'next' } })
```
