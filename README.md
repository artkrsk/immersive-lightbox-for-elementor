# Arts Immersive Lightbox for Elementor

[![Tests](https://img.shields.io/github/actions/workflow/status/artkrsk/immersive-lightbox-for-elementor/test.yml?style=flat-square&logo=githubactions&logoColor=white&label=tests)](https://github.com/artkrsk/immersive-lightbox-for-elementor/actions/workflows/test.yml)
[![WordPress](https://img.shields.io/badge/WordPress-6.2+-21759b?style=flat-square&logo=wordpress&logoColor=white)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0+-777bb4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![Version](https://img.shields.io/wordpress/plugin/v/immersive-lightbox-for-elementor?style=flat-square&logo=wordpress&logoColor=white&label=wp.org)](https://wordpress.org/plugins/immersive-lightbox-for-elementor/)
[![Installs](https://img.shields.io/wordpress/plugin/installs/immersive-lightbox-for-elementor?style=flat-square)](https://wordpress.org/plugins/immersive-lightbox-for-elementor/)
[![Rating](https://img.shields.io/wordpress/plugin/rating/immersive-lightbox-for-elementor?style=flat-square)](https://wordpress.org/plugins/immersive-lightbox-for-elementor/reviews/)

A lightbox engine for Elementor built on a tuned PhotoSwipe fork: grouped galleries, video, captions, flight transitions. Part of the free plugin collection at [artemsemkin.com/plugins/immersive-lightbox-for-elementor/](https://artemsemkin.com/plugins/immersive-lightbox-for-elementor/).

## Development

```bash
pnpm install && composer install
cp .env.example .env   # set DEV_TARGET to your Local site's plugin dir
```

| Command | What |
|---|---|
| `pnpm dev:plugin` | watch-compile + mirror the plugin to `DEV_TARGET` |
| `pnpm build` | release build into `dist/` |
| `pnpm test` / `pnpm test:coverage` | Vitest |
| `pnpm release <patch\|minor\|major>` | bump, stamp, validate changelog, commit, tag |

Everything else (lint, typecheck, knip, fallow) runs via `pnpm exec` — see the [tooling docs](https://github.com/artkrsk/wp-plugin-tooling). Public API contracts live in [DEVELOPERS.md](DEVELOPERS.md).

## License

GPL-3.0-or-later. Bundles a fork of [PhotoSwipe](https://photoswipe.com/) (MIT).
