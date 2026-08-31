=== Arts Immersive Lightbox for Elementor ===
Contributors: artemsemkin
Tags: lightbox, elementor, gallery, photoswipe, video lightbox
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0
GitHub Plugin URI: https://github.com/artkrsk/immersive-lightbox-for-elementor/

A PhotoSwipe lightbox that replaces Elementor's native one: cinematic transitions, mousemove explore pan, video galleries, any link as a trigger.

== Description ==

Your Elementor images, galleries and videos already open in a lightbox. This plugin makes that moment the best part of the page. Activate it and the native lightbox is replaced with an immersive, PhotoSwipe-powered one: the kind of cinematic, premium feel that usually stays locked inside high-end portfolio themes, now on any Elementor site with zero setup.

= What you get =

* **Cinematic open and close** — the image you click travels into the lightbox and settles back exactly where it came from, however far the visitor has scrolled. The kind of detail people notice before they can say why.
* **Explore pan** — zoom into a high-resolution photo and it glides with the mouse: visitors wander across every detail just by moving the cursor, the way they'd lean closer to a print. A gift for photographers. Your work gets studied, not skimmed.
* **Any link opens the lightbox** — every Elementor URL field gains an "Open in lightbox" checkbox: buttons, icons, text links, widgets from any addon. Paste a YouTube or Vimeo link and it opens as video.
* **Drag navigation on desktop** — pull slides across with the mouse, with the same physics as a touch swipe.
* **Thumbnail navigation** — a rail of thumbnails for jumping straight to any slide.
* **Video slides** — YouTube, Vimeo and self-hosted video files, detected straight from the link. No setup.
* **Grouped galleries** — images from different widgets and sections can join one gallery.
* **Captions and counter** — the caption reads the same title and description fields as the native lightbox, so nothing needs re-entering.
* **Styled in Site Settings** — Elementor's existing Lightbox settings (colors, typography, counter) drive this lightbox, editable live in the editor.
* **Touch gestures and keyboard** — swipe, pinch zoom, arrow keys, Esc, looping galleries.

= Light by design =

* The engine loads only when a visitor opens the lightbox; until that first click the page carries just a tiny loader script.
* Zero dependencies — the engine bundles its own tuned PhotoSwipe fork and needs nothing else, not even jQuery.
* Everything ships in the free plugin. There is no Pro tier, your dashboard stays free of ads and nag screens, and nothing ever calls an external server.

= Works with =

* Elementor Free — Image, Basic Gallery, Image Carousel and every widget that opens the native lightbox. Elementor Pro widgets, including the Media Carousel's video slides, work too.
* Any theme.
* Arts Cursor Follower for Elementor — adds a hover hint (magnifier, plus, or a text pill) over lightbox links.

= For developers =

The plugin fires CustomEvents (`arts-lightbox:open`, `arts-lightbox:change`, `arts-lightbox:destroy`), exposes CSS custom properties for sizing and theming, and understands a small `data-arts-lightbox-*` attribute vocabulary for captions, groups, HTML slides and opt-outs. The TypeScript source and the full contract live on GitHub: https://github.com/artkrsk/immersive-lightbox-for-elementor

== Installation ==

1. Install and activate the plugin. Elementor must be active.
2. There is no step 2 — links Elementor would open in its lightbox now open in this one, following the same rules (including the Image Lightbox switch in Site Settings).
3. To restyle it, open Site Settings → Lightbox in the Elementor editor.

== Frequently Asked Questions ==

= Does it require Elementor Pro? =

No. The free Elementor plugin is enough. If you have Pro, its gallery and carousel widgets work as well.

= Do I need to configure anything? =

No. The plugin follows Elementor's own lightbox rules: whatever would open in the native lightbox opens here instead. Widgets with "Lightbox: No" stay excluded, and the kit's Image Lightbox switch still governs plain image links.

= Does it work with YouTube and Vimeo? =

Yes. YouTube and Vimeo URLs and video files open as video slides automatically — the plugin detects them from the link itself.

= Can a button or an icon open the lightbox? =

Yes — any element with a link. Every Elementor URL control has an "Open in lightbox" checkbox: tick it and the link opens in the lightbox instead of a new page. That covers image links as well as YouTube, Vimeo and video file URLs.

= How do I change the lightbox colors and fonts? =

In the Elementor editor, open Site Settings → Lightbox. Background, UI and text colors plus caption and counter typography apply to this lightbox, with a live preview.

= Can images from different sections join one gallery? =

Yes. Widgets already grouped by Elementor's slideshow setting stay grouped, and a `data-arts-lightbox-group` attribute joins anything else across containers.

= Will it slow down my site? =

No. Nothing heavy loads up front — the engine and its styles are fetched the first time a visitor opens the lightbox, and the plugin has zero dependencies.

= What happens if I deactivate the plugin? =

Elementor's native lightbox returns exactly as it was. The plugin claims clicks in the browser and never rewrites your content.

== Screenshots ==

1. The lightbox open on a gallery: thumbnail rail, slide counter and arrows, with video slides sitting in the same strip as the images.
2. Site Settings → Lightbox in the Elementor editor — every setting for this plugin lives inside Elementor's own panel.
3. Lightbox Transitions: a Curtain or Fade opening style, the curtain's edge shape, and how long the transition runs.
4. Lightbox Interface: the thumbnail rail and its position, captions, counter typography, backdrop opacity and slide corner radius.
5. Lightbox Behavior: gallery looping, uniting galleries on a page, zoom mode, mouse-wheel zoom, explore pan and video autoplay.
6. Every Elementor URL field gains an "Open in lightbox" checkbox — buttons, icons and text links, including YouTube and Vimeo URLs.

== Changelog ==

= 1.0.0 =
Initial release.
