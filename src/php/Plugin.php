<?php

namespace Arts\ImmersiveLightbox;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Frontend bootstrap. The engine builds its own chrome client-side, so no
 * PHP markup printer exists — the plugin's only front-end output is the
 * inline gate, which holds the first candidate click, lazy-loads the
 * stylesheet + engine, and replays the click once the engine is live.
 *
 * Takeover is structural, not suppressive: nothing server-side disables or
 * rewrites Elementor's native lightbox. The gate's capture-phase listener
 * claims eligible clicks before Elementor's bubble-phase delegation can see
 * them, and when this plugin is deactivated (or soft-disabled via the
 * `arts_immersive_lightbox/enabled` filter) the gate simply never prints — the
 * native lightbox is back untouched.
 */
class Plugin {
	private static ?Plugin $instance = null;

	/** Memoized `arts_immersive_lightbox/enabled` verdict for this request. */
	private ?bool $enabled = null;

	public static function instance(): Plugin {
		return self::$instance ??= new self();
	}

	private function __construct() {
		// Late in the head on purpose: the gate needs only "inside <head>"
		// (it paints nothing), so it sits after the page's own meta/styles.
		add_action( 'wp_head', array( $this, 'print_gate' ), 99 );
		// Last on the filter so every other plugin's attributes are already in
		// the string by the time we merge into them — see the callback.
		add_filter( 'language_attributes', array( $this, 'filter_language_attributes' ), PHP_INT_MAX );

		// Plugins load in whatever order `active_plugins` holds, and Elementor
		// fires this action during its OWN load — a plugin sorting after it
		// would never see the action if it only ever add_action()'d here.
		if ( did_action( 'elementor/loaded' ) ) {
			$this->init_elementor();
		} else {
			add_action( 'elementor/loaded', array( $this, 'init_elementor' ) );
		}

		// Only the standalone plugin has a Plugins-page row to attach a link
		// to — the constant comes from the bootstrap file, absent when src/php
		// is consumed as a composer package.
		if ( defined( 'ARTS_IMMERSIVE_LIGHTBOX_PLUGIN_FILE' ) ) {
			add_filter(
				'plugin_action_links_' . plugin_basename( ARTS_IMMERSIVE_LIGHTBOX_PLUGIN_FILE ),
				array( $this, 'add_plugin_action_links' )
			);
		}
	}

	public function init_elementor(): void {
		add_action( 'elementor/controls/register', array( $this, 'register_url_control' ) );
		add_action( 'elementor/editor/after_enqueue_scripts', array( $this, 'enqueue_editor_script' ) );
		add_action( 'elementor/editor/after_enqueue_styles', array( $this, 'enqueue_editor_style' ) );
		( new Elementor\UrlControlManager() )->register();
		( new Elementor\KitLightboxSettings() )->register();
		( new Elementor\CursorFollowerBridge() )->register();
	}

	/** @param \Elementor\Controls_Manager $controls_manager */
	public function register_url_control( $controls_manager ): void {
		$controls_manager->register( new Elementor\Controls\UrlControl() );
	}

	/** The control view for the upgraded URL control — editor only. */
	public function enqueue_editor_script(): void {
		$slug = 'immersive-lightbox-for-elementor';
		$file = untrailingslashit( plugin_dir_path( __FILE__ ) ) . '/libraries/' . $slug . '/editor.js';

		if ( ! file_exists( $file ) ) {
			return;
		}

		wp_enqueue_script(
			$slug . '-editor',
			untrailingslashit( plugin_dir_url( __FILE__ ) ) . '/libraries/' . $slug . '/editor.js',
			array( 'elementor-editor' ),
			(string) filemtime( $file ),
			true
		);
	}

	/**
	 * Prepends "Settings" to the plugin's row on the Plugins page, deep-linking
	 * into Elementor's Lightbox panel in Site Settings — where every setting
	 * this plugin has lives, otherwise reachable only by knowing it's there.
	 * No capability check: this filter only fires for users who can already
	 * see the Plugins list.
	 *
	 * @param array<int|string, string> $links
	 * @return array<int|string, string>
	 */
	public function add_plugin_action_links( array $links ): array {
		$url = $this->site_settings_url();

		if ( '' === $url ) {
			return $links;
		}

		array_unshift(
			$links,
			sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
				esc_url( $url ),
				esc_html__( 'Settings', 'immersive-lightbox-for-elementor' )
			)
		);

		return $links;
	}

	/**
	 * Editor URL landing on the native Lightbox panel — our controls extend
	 * Elementor's own section rather than adding a tab, so the target is its
	 * tab id, not one of ours. Returns '' when the URL can't be built
	 * (Elementor inactive, or a fresh site with nothing edited yet).
	 *
	 * The editor needs an ordinary document to boot against, so `post` is the
	 * most recently edited post — the same trick Elementor's own admin-bar
	 * "Site Settings" link uses. `active-document` then switches it to the kit,
	 * and Elementor's SwitchToActiveTab hook reads `active-tab` and routes
	 * panel/global/{tab} — no JS on our side.
	 */
	private function site_settings_url(): string {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! class_exists( '\Elementor\Utils' ) ) {
			return '';
		}

		$recent = \Elementor\Utils::get_recently_edited_posts_query( array( 'posts_per_page' => 1 ) );

		if ( ! $recent->post_count ) {
			return '';
		}

		$posts = $recent->get_posts();
		$post  = reset( $posts );

		if ( ! $post instanceof \WP_Post || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return '';
		}

		$kit_id = \Elementor\Plugin::$instance->kits_manager->get_active_id();
		if ( ! is_scalar( $kit_id ) ) {
			return '';
		}

		return admin_url(
			'post.php?post=' . $post->ID
			. '&action=elementor&active-document=' . $kit_id
			. '&active-tab=' . Elementor\KitLightboxSettings::TAB_ID
		);
	}

	/**
	 * The editor-panel styles for the upgraded URL control. Elementor scopes
	 * its own URL-control CSS to `.elementor-control-type-url` — a control
	 * registered under a new type inherits none of it, so without this the
	 * options popover renders flat and the autocomplete spinner never hides.
	 */
	public function enqueue_editor_style(): void {
		$slug = 'immersive-lightbox-for-elementor';
		$file = untrailingslashit( plugin_dir_path( __FILE__ ) ) . '/libraries/' . $slug . '/editor.css';

		if ( ! file_exists( $file ) ) {
			return;
		}

		wp_enqueue_style(
			$slug . '-editor',
			untrailingslashit( plugin_dir_url( __FILE__ ) ) . '/libraries/' . $slug . '/editor.css',
			array(),
			(string) filemtime( $file )
		);
	}

	/**
	 * Prints the pre-paint gate inline on wp_head — the plugin's ONLY
	 * front-end output. Nothing is enqueued: the gate installs the discovery
	 * global and the <html> state classes synchronously, then fetches the
	 * stylesheet + engine on the first candidate click (or hover pre-warm),
	 * holding that click and replaying it once the engine is ready. The real
	 * asset tags are created client-side at load time, which keeps them out
	 * of the output buffer that cache/optimizer plugins rewrite.
	 *
	 * The markers are per-plugin opt-outs, none honored by the others:
	 * noptimize comments (Autoptimize), data-no-optimize (LiteSpeed),
	 * data-cfasync (Cloudflare Rocket Loader), nowprocket (WP Rocket). The
	 * tag itself deliberately carries NO id — AJAX page-transition systems
	 * re-execute id'd head scripts on every transition.
	 *
	 * Options ride the same block as inline JSON, not wp_localize_script:
	 * localize string-casts scalars (a `false` would become "", defeating the
	 * engine's type checks); json_encode preserves types.
	 */
	public function print_gate(): void {
		if ( ! $this->is_enabled() ) {
			return;
		}

		$slug     = 'immersive-lightbox-for-elementor';
		$base_dir = untrailingslashit( plugin_dir_path( __FILE__ ) ) . '/libraries/' . $slug;
		$base_url = untrailingslashit( plugin_dir_url( __FILE__ ) ) . '/libraries/' . $slug;

		$gate = $base_dir . '/gate.js';
		$js   = $base_dir . '/' . $slug . '.js';
		$css  = $base_dir . '/' . $slug . '.css';

		if ( ! file_exists( $gate ) || ! file_exists( $js ) || ! file_exists( $css ) ) {
			return;
		}

		$options   = Options::build();
		$elementor = $options['elementor'] ?? null;

		$boot = array(
			'js'             => esc_url_raw( $base_url . '/' . $slug . '.js?ver=' . filemtime( $js ) ),
			'css'            => esc_url_raw( $base_url . '/' . $slug . '.css?ver=' . filemtime( $css ) ),
			'enabled'        => true,
			'editor'         => $this->is_editor_preview(),
			// The gate never reads the full options payload, so the resolved
			// kit switch prints twice — one computation, two consumers.
			'nativeFallback' => is_array( $elementor ) && ! empty( $elementor['nativeFallback'] ),
		);

		// (object) so an empty options array prints as {} rather than [] — the
		// engine deep-merges the payload over its defaults, and a top-level []
		// would replace the whole options object instead of patching it.
		$code = 'window.artsImmersiveLightboxOptions = ' . wp_json_encode( (object) $options ) . ";\n"
			. 'window.artsImmersiveLightboxBoot = ' . wp_json_encode( $boot ) . ";\n"
			. file_get_contents( $gate );

		echo "<!--noptimize-->\n";
		wp_print_inline_script_tag(
			$code,
			array(
				'data-no-optimize' => '1',
				'data-cfasync'     => 'false',
				'nowprocket'       => true,
			)
		);
		echo "<!--/noptimize-->\n";
	}

	/**
	 * Lazily memoized `arts_immersive_lightbox/enabled` verdict — evaluated once
	 * per request, shared by the <html> class filter and the gate printer.
	 *
	 * Unlike a cosmetic effect, the editor preview gets NO bypass here: the
	 * lightbox changes what a click does, so a site owner who disabled it via
	 * the filter should preview what visitors actually get — Elementor's
	 * native lightbox — not a phantom always-on preview of a disabled feature.
	 */
	public function is_enabled(): bool {
		return $this->enabled ??= (bool) apply_filters( 'arts_immersive_lightbox/enabled', true );
	}

	/**
	 * A request disabled via `arts_immersive_lightbox/enabled` still gets
	 * `no-arts-lightbox` on <html>: the class pair is the documented "which
	 * world" signal, and a page carrying neither class would be a third state
	 * no CSS consumer handles. It cannot ride the gate (which simply doesn't
	 * print when disabled) and cannot wait for wp_head — language_attributes
	 * renders inside the <html> tag itself.
	 *
	 * Merged, never appended: this filter is the only route to an <html>
	 * class, so other plugins pile onto it too, and a second class attribute
	 * is a parse error the browser resolves by silently dropping ours. The
	 * tag processor writes into whichever attribute the browser will actually
	 * read; the synthetic <html> wrapper is ours, hence the fixed substr.
	 *
	 * Front end only, and that guard is load-bearing: the admin runs this
	 * filter too (_wp_admin_html_begin), but prints the <html> class
	 * attribute ahead of the filtered string, outside what we merge into —
	 * so there the append branch would write the second class attribute
	 * described above.
	 *
	 * @param string $output
	 */
	public function filter_language_attributes( string $output ): string {
		if ( is_admin() || $this->is_enabled() ) {
			return $output;
		}

		$tags = new \WP_HTML_Tag_Processor( '<html ' . $output . '>' );

		// Nothing to merge into: $output didn't parse as attributes at all.
		if ( ! $tags->next_tag() ) {
			return $output . ' class="no-arts-lightbox"';
		}

		$tags->add_class( 'no-arts-lightbox' );

		return substr( $tags->get_updated_html(), 6, -1 );
	}

	/**
	 * The preview iframe loads the engine immediately (the gate skips its
	 * lazy path when `editor` is true) — a first click inside the canvas
	 * should demonstrate the lightbox without a cold-load pause.
	 */
	private function is_editor_preview(): bool {
		return class_exists( '\Elementor\Plugin' )
			&& \Elementor\Plugin::$instance->preview->is_preview_mode();
	}
}
