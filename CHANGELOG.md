# Changelog

## Unreleased

* fixed: opening an image no longer flashes the page background where the picture was. The clicked image stays on the page under the flying copy until the transition settles, the flying copy is drawn once at its landing size and moved by the compositor instead of being resized every frame, and it never swaps its file mid-flight.
* improved: hovering a link now decodes the full-size image as well as fetching it, so the opening transition can carry the sharp file from its first frame.
* added: a caption or a tint overlay placed over a linked image can ride the opening and closing transition (`data-arts-lightbox-fly`), fading with the picture instead of cutting out the moment it starts moving.

## 1.0.3 – October 8, 2026

* added: the lightbox now takes over the WooCommerce product gallery, including image and video items grouped per product, and hover zoom keeps working.
* added: themes and custom integrations can now use a standalone browser build of the lightbox with a clean open and close lifecycle.
* fixed: product pages no longer show a second lightbox without its dark backdrop, and the lightbox styles no longer affect other lightboxes on the page.

## 1.0.2 – September 20, 2026

* added: active lightbox-root observation and the opening source element in lightbox events make custom widget integrations more reliable.
* improved: clicking a thumbnail no longer leaves an unnecessary keyboard-focus outline behind after navigation.
* fixed: lightbox navigation with the Left and Right Arrow keys now follows reading direction on right-to-left sites.
* fixed: opening and closing transitions now stay visually aligned with horizontally cropped media, and no longer hide a linked card’s caption, badge, or other surrounding content.

## 1.0.1 – September 11, 2026

* improved: thumbnail navigation can now show a preview from self-hosted videos without poster images, when the browser allows it.
* improved: the lightbox now prepares in idle time on pages that use it, making the first open feel faster.

## 1.0.0 – August 31, 2026

Initial release.
