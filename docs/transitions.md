# Transitions

The hard case the engine was designed around: source images with
**border-radius, overflow crop, and live parallax** on the inner image. The
flight capture is geometric (it measures rects, not mechanisms), so both
parallax generations must behave identically:

## Classic parallax (transform channel — ArtsParallax mechanism)

Scroll-driven keyframes writing `transform: translateY(…) scale(1.15)` —
the channel GSAP-era parallax writes to. Each card drifts with a different
amplitude; open at any scroll position, the flight captures the mid-drift
state, un-does it in the air, and re-applies the current state on close.

<script setup>
import parallaxCards from './demos/parallax-cards.html?raw'
import trueParallax from './demos/true-parallax.html?raw'
</script>

<LightboxDemo :html="parallaxCards" />

<<< @/demos/parallax-cards.html

## True parallax (production contract, 1:1)

The real thing: scroll-driven parallax — `translate` drift keyframes on a
`view-timeline`, **overscan via the `scale` property** derived from the drift
factor (`dy: 0.1` → scale 1.2), the frame clipping with a radius. The image is
a real asset with real attachment dimensions. Scroll to a few different
positions and open — the flight must capture whatever mid-drift state the
inner image is in:

<LightboxDemo :html="trueParallax" />

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
