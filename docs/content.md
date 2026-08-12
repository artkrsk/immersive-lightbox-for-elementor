# Content types

> Reboot recipes apply until the next reload — `artsLightboxPlayground.reboot()` (no arguments) resets to defaults immediately.

Images, self-hosted video, YouTube/Vimeo embeds, and arbitrary HTML — all
first-class slide types in one gallery. Video plays on activation and pauses
the moment you swipe away; the full video story (background-video adoption,
sound policy, URL forms) lives on the [Video](/videos) page. Video/html
slides are fit-only — zoom and explore stay image features.

<script setup>
import mixedContent from './demos/mixed-content.html?raw'
import tallExplore from './demos/tall-explore.html?raw'
</script>

<LightboxDemo :html="mixedContent" />

<<< @/demos/mixed-content.html

## Explore mode

**This is the default experience:** slides open already zoomed to cover
(`fill`, which is also the zoom ceiling), the mouse explores by simply
moving (no dragging — a horizontal mouse drag navigates slides instead),
and a click toggles out to fit and back.

<LightboxDemo :html="tallExplore" />

```js
// the classic contained opening instead
artsLightboxPlayground.reboot({ zoom: { initialLevel: 'fit' } })

// other desktop zoom ergonomics
artsLightboxPlayground.reboot({ zoom: { wheelToZoom: true } })
artsLightboxPlayground.reboot({ zoom: { imageClickAction: 'next' } })
```
