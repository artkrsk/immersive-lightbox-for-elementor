# Transitions

The hard case the engine was designed around: source images with
**border-radius, overflow crop, and a mid-scroll parallax offset** on the
inner image (each card below carries a different offset). On open, the
clicked image is promoted above the curtain and un-does all three while it
travels; on close it re-applies whatever the source's current state is.

<script setup>
import parallaxCards from './demos/parallax-cards.html?raw'
</script>

<LightboxDemo :html="parallaxCards" />

<<< @/demos/parallax-cards.html

## Variants

Flip options live from the console — each call recreates the engine:

```js
// close continues out the top instead of pulling back down
artsLightboxPlayground.reboot({ transition: { close: 'through' } })

// plain fade backdrop instead of the curtain
artsLightboxPlayground.reboot({ transition: { preset: 'fade' } })

// flat curtain edge (no bow)
artsLightboxPlayground.reboot({ transition: { edge: 'straight' } })

// slower, for frame-by-frame inspection
artsLightboxPlayground.reboot({ transition: { duration: 2000 } })
```
