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

## Thumbnails, download, slideshow

```js
artsLightboxPlayground.reboot({
  ui: { thumbnails: true, download: true },
  slideshow: { enabled: true, interval: 3000 }
})
```
