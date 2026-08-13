# Arts Better Lightbox for Elementor

<!-- Badges activate when the repo goes public:
[![Tests](https://img.shields.io/github/actions/workflow/status/artkrsk/better-lightbox-for-elementor/test.yml?style=flat-square&logo=githubactions&logoColor=white&label=tests)](https://github.com/artkrsk/better-lightbox-for-elementor/actions/workflows/test.yml)
[![WordPress](https://img.shields.io/badge/WordPress-6.0+-21759b?style=flat-square&logo=wordpress&logoColor=white)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0+-777bb4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
And once live on wp.org: version / installs / rating badges (shields.io wordpress endpoints). -->

A lightbox engine for Elementor built on a tuned PhotoSwipe fork: grouped galleries, video, captions, flight transitions. Part of the free plugin collection at [artemsemkin.com/plugins/better-lightbox-for-elementor/](https://artemsemkin.com/plugins/better-lightbox-for-elementor/).

Frontend-first: the WordPress/Elementor PHP integration is phase 2. Not yet submitted to WordPress.org.

## Development

```bash
pnpm install && composer install
cp .env.example .env   # set DEV_TARGET to your Local site's plugin dir
```

| Command | What |
|---|---|
| `pnpm dev` | browser harness (the VitePress docs site — engine boots live on every page) |
| `pnpm dev:plugin` | watch-compile + mirror the plugin to `DEV_TARGET` |
| `pnpm build` | release build into `dist/` |
| `pnpm test` / `pnpm test:coverage` | Vitest |
| `pnpm release <patch\|minor\|major>` | bump, stamp, validate changelog, commit, tag |

Everything else (lint, typecheck, knip, fallow) runs via `pnpm exec` — see the [tooling docs](https://github.com/artkrsk/wp-plugin-tooling). Public API contracts live in [docs/developers.md](docs/developers.md).

## License

GPL-3.0-or-later. Bundles a fork of [PhotoSwipe](https://photoswipe.com/) (MIT).
