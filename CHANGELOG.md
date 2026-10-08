# Changelog

## 1.0.3

* added: the lightbox now takes over the WooCommerce product gallery, including image and video items grouped per product, and hover zoom keeps working.
* added: themes and custom integrations can now use a standalone browser build of the lightbox with a clean open and close lifecycle.
* fixed: product pages no longer show a second lightbox without its dark backdrop, and the lightbox styles no longer affect other lightboxes on the page.

## 1.0.2

* added: active lightbox-root observation and the opening source element in lightbox events make custom widget integrations more reliable.
* improved: clicking a thumbnail no longer leaves an unnecessary keyboard-focus outline behind after navigation.
* fixed: lightbox navigation with the Left and Right Arrow keys now follows reading direction on right-to-left sites.
* fixed: opening and closing transitions now stay visually aligned with horizontally cropped media, and no longer hide a linked card’s caption, badge, or other surrounding content.

## 1.0.1

* improved: thumbnail navigation can now show a preview from self-hosted videos without poster images, when the browser allows it.
* improved: the lightbox now prepares in idle time on pages that use it, making the first open feel faster.

## 1.0.0

Initial release.
