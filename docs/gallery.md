# Galleries

## Groups and pass-through

Two explicit groups. With defaults, each opens its own lightbox. Enable
pass-through and navigation continues from group A into group B:

```js
artsLightboxPlayground.reboot({ gallery: { passThrough: true, loop: false } })
```

Unite everything on the page into one gallery instead:

```js
artsLightboxPlayground.reboot({ gallery: { uniteAll: true } })
```

<script setup>
import groupsVsUnited from './demos/groups-vs-united.html?raw'
import infiniteClones from './demos/infinite-clones.html?raw'
import mixedCaptions from './demos/mixed-captions.html?raw'
import stressSwipe from './demos/stress-swipe.html?raw'
</script>

<LightboxDemo :html="groupsVsUnited" />

<<< @/demos/groups-vs-united.html

## Clones (infinite lists)

The same image appears three times; the gallery holds it **once**. Click any
clone — the flight launches from the one you clicked, and the close flight
returns to the nearest visible instance:

<LightboxDemo :html="infiniteClones" />

<<< @/demos/infinite-clones.html

## Stress: fast swiping

Twelve slides for rapid mouse-drag and arrow-key hammering (upstream had a
fast-swipe race in this area — verify slides never come up empty):

<LightboxDemo :html="stressSwipe" />

## Captions of every length

Captions are projected from the live slide position rather than played on a
change event, so they move **with** a drag and reverse when it reverses, and
the direction they come from is the direction you travelled.

This gallery deliberately mixes them: one short, one long enough to wrap to
several lines, one with none at all, one typical. Drag slowly between the long
and the short one — they share a bottom edge and grow upward, and a slide with
no caption simply fades the previous one out with nothing arriving.

<LightboxDemo :html="mixedCaptions" />

<<< @/demos/mixed-captions.html

## Thumbnails, download, slideshow

All three are **off by default**, so nothing appears until you ask for them:

```js
artsLightboxPlayground.reboot({
  ui: { thumbnails: true, download: true },
  slideshow: { enabled: true, interval: 3000 }
})
```

The strip rides any edge, and whatever else lives there steps aside — a side
rail insets the arrows, a bottom one lifts the caption clear:

```js
artsLightboxPlayground.reboot({ ui: { thumbnails: true, thumbnailsPosition: 'left' } })
```

`'bottom'` (default), `'top'`, `'left'`, `'right'`. The strip scrolls itself
from the same slide position the captions read, so it glides with a drag
instead of catching up afterwards. With the slideshow running, the active
thumbnail fills over the interval.

Pair it with the stress gallery above to see the strip actually scroll —
a handful of slides never overflows it.
