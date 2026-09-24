<?php

declare( strict_types=1 );

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	$GLOBALS['arts_lightbox_test_actions'] = array();
	$GLOBALS['arts_lightbox_test_filters'] = array();

	function add_action( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): void {
		$GLOBALS['arts_lightbox_test_actions'][ $hook ][] = array( $callback, $priority, $accepted_args );
	}

	function add_filter( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): void {
		$GLOBALS['arts_lightbox_test_filters'][ $hook ][ $priority ][] = array( $callback, $accepted_args );
	}

	function apply_filters( string $hook, mixed $value, mixed ...$args ): mixed {
		$filters = $GLOBALS['arts_lightbox_test_filters'][ $hook ] ?? array();
		ksort( $filters );

		foreach ( $filters as $callbacks ) {
			foreach ( $callbacks as list( $callback, $accepted_args ) ) {
				$value = $callback( ...array_slice( array_merge( array( $value ), $args ), 0, $accepted_args ) );
			}
		}

		return $value;
	}

	function did_action( string $hook ): int {
		return $GLOBALS['arts_lightbox_test_did_actions'][ $hook ] ?? 0;
	}

	function __( string $text, string $domain = '' ): string {
		return $text;
	}

	function esc_html__( string $text, string $domain = '' ): string {
		return $text;
	}

	function esc_attr__( string $text, string $domain = '' ): string {
		return $text;
	}

	function esc_url( string $url ): string {
		return $url;
	}

	function esc_url_raw( string $url ): string {
		return $url;
	}

	function is_admin(): bool {
		return false;
	}

	function untrailingslashit( string $path ): string {
		return rtrim( $path, '/' );
	}

	function arts_lightbox_test_filter( string $hook, callable $callback ): void {
		add_filter( $hook, $callback );
	}

	function arts_lightbox_test_did_action( string $hook, int $count ): void {
		$GLOBALS['arts_lightbox_test_did_actions'][ $hook ] = $count;
	}

	/*
	 * Theme supports, enqueues and removals — recorded, so a test can read
	 * back exactly what the code under test switched on or off.
	 */
	$GLOBALS['arts_lightbox_test_theme_supports'] = array();
	$GLOBALS['arts_lightbox_test_calls']          = array();

	function arts_lightbox_test_record( string $function, mixed ...$args ): void {
		$GLOBALS['arts_lightbox_test_calls'][] = array( $function, $args );
	}

	/** @return array<int, array<int, mixed>> The argument lists of every call to $function. */
	function arts_lightbox_test_calls( string $function ): array {
		$calls = array();

		foreach ( $GLOBALS['arts_lightbox_test_calls'] as list( $name, $args ) ) {
			if ( $function === $name ) {
				$calls[] = $args;
			}
		}

		return $calls;
	}

	function current_theme_supports( string $feature ): bool {
		return in_array( $feature, $GLOBALS['arts_lightbox_test_theme_supports'], true );
	}

	function add_theme_support( string $feature ): void {
		$GLOBALS['arts_lightbox_test_theme_supports'][] = $feature;
	}

	function remove_theme_support( string $feature ): bool {
		arts_lightbox_test_record( __FUNCTION__, $feature );
		$GLOBALS['arts_lightbox_test_theme_supports'] = array_values(
			array_diff( $GLOBALS['arts_lightbox_test_theme_supports'], array( $feature ) )
		);

		return true;
	}

	function remove_action( string $hook, callable|string $callback, int $priority = 10 ): bool {
		arts_lightbox_test_record( __FUNCTION__, $hook, $callback, $priority );

		return true;
	}

	function wp_register_style( string $handle, string|false $src, array $deps = array(), string|bool|null $ver = false ): bool {
		arts_lightbox_test_record( __FUNCTION__, $handle, $src );

		return true;
	}

	function wp_enqueue_style( string $handle ): void {
		arts_lightbox_test_record( __FUNCTION__, $handle );
	}

	function wp_add_inline_style( string $handle, string $data ): bool {
		arts_lightbox_test_record( __FUNCTION__, $handle, $data );

		return true;
	}

	function wp_dequeue_style( string $handle ): void {
		arts_lightbox_test_record( __FUNCTION__, $handle );
	}

	function wp_dequeue_script( string $handle ): void {
		arts_lightbox_test_record( __FUNCTION__, $handle );
	}

	$GLOBALS['arts_lightbox_test_captions'] = array();

	function wp_get_attachment_caption( int $post_id = 0 ): string|false {
		return $GLOBALS['arts_lightbox_test_captions'][ $post_id ] ?? false;
	}

	function wp_strip_all_tags( string $text ): string {
		return trim( strip_tags( $text ) );
	}

	$GLOBALS['arts_lightbox_test_post_id'] = false;

	function get_the_ID(): int|false {
		return $GLOBALS['arts_lightbox_test_post_id'];
	}

	if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		/**
		 * The slice of core's tag processor the plugin uses, over the first
		 * matching tag only: enough to assert which attributes get written,
		 * with none of core's tokenizer. Attribute values are unescaped
		 * double-quoted strings in, escaped double-quoted strings out.
		 */
		class WP_HTML_Tag_Processor {
			private ?int $start = null;

			private int $length = 0;

			private string $tag = '';

			/** @var array<string, string|true> */
			private array $attributes = array();

			public function __construct( private string $html ) {}

			/** @param array{tag_name?: string} $query */
			public function next_tag( array $query = array() ): bool {
				$name = strtolower( $query['tag_name'] ?? '[a-z][a-z0-9-]*' );

				if ( ! preg_match( '/<(' . $name . ')\b([^>]*)>/i', $this->html, $match, PREG_OFFSET_CAPTURE ) ) {
					return false;
				}

				$this->start  = $match[0][1];
				$this->length = strlen( $match[0][0] );
				$this->tag    = $match[1][0];

				preg_match_all( '/([^\s=\/>]+)(?:\s*=\s*"([^"]*)")?/', $match[2][0], $pairs, PREG_SET_ORDER );
				foreach ( $pairs as $pair ) {
					$this->attributes[ strtolower( $pair[1] ) ] = isset( $pair[2] ) ? html_entity_decode( $pair[2], ENT_QUOTES ) : true;
				}

				return true;
			}

			public function get_attribute( string $name ): string|true|null {
				return $this->attributes[ strtolower( $name ) ] ?? null;
			}

			public function set_attribute( string $name, string|bool $value ): bool {
				$this->attributes[ strtolower( $name ) ] = true === $value ? true : (string) $value;

				return true;
			}

			public function get_updated_html(): string {
				if ( null === $this->start ) {
					return $this->html;
				}

				$tag = '<' . $this->tag;
				foreach ( $this->attributes as $name => $value ) {
					$tag .= true === $value ? ' ' . $name : ' ' . $name . '="' . htmlspecialchars( $value, ENT_QUOTES ) . '"';
				}

				return substr_replace( $this->html, $tag . '>', $this->start, $this->length );
			}
		}
	}
}

namespace Elementor {
	class Plugin {
		public static ?self $instance = null;

		public mixed $kits_manager = null;

		public mixed $preview = null;
	}

	class Controls_Manager {
		public const URL      = 'url';
		public const HEADING  = 'heading';
		public const SELECT   = 'select';
		public const SLIDER   = 'slider';
		public const SWITCHER = 'switcher';
		public const TEXT     = 'text';
	}

	class Control_URL {}

	class Group_Control_Typography {
		public static function get_type(): string {
			return 'typography';
		}
	}
}

namespace Arts\ImmersiveLightbox\Tests\Support {
	class KitManager {
		/** @param array<string, mixed> $settings */
		public function __construct( private array $settings = array() ) {}

		public function get_current_settings( string $key ): mixed {
			return $this->settings[ $key ] ?? null;
		}
	}

	class ControlsStack {
		/** @var array<int, array{method: string, args: array<int, mixed>}> */
		public array $calls = array();

		/** @param array<string, mixed> $controls */
		public function __construct( private array $controls = array() ) {}

		/** @return array<string, mixed> */
		public function get_controls(): array {
			return $this->controls;
		}

		public function update_control( string $id, array $control, array $options = array() ): void {
			$this->calls[] = array( 'method' => 'update_control', 'args' => array( $id, $control, $options ) );
		}

		public function start_controls_section( string $id, array $options ): void {
			$this->calls[] = array( 'method' => 'start_controls_section', 'args' => array( $id, $options ) );
		}

		public function end_controls_section(): void {
			$this->calls[] = array( 'method' => 'end_controls_section', 'args' => array() );
		}

		public function add_control( string $id, array $options, array $position = array() ): void {
			$this->calls[] = array( 'method' => 'add_control', 'args' => array( $id, $options, $position ) );
		}

		public function add_group_control( string $type, array $options ): void {
			$this->calls[] = array( 'method' => 'add_group_control', 'args' => array( $type, $options ) );
		}

		/** @return array<int, array{method: string, args: array<int, mixed>}> */
		public function calls( string $method ): array {
			return array_values(
				array_filter(
					$this->calls,
					static fn( array $call ): bool => $method === $call['method']
				)
			);
		}
	}

	class Widget {
		/** @param array<string, mixed> $settings */
		public function __construct( private array $settings ) {}

		/** @return array<string, mixed> */
		public function get_settings_for_display(): array {
			return $this->settings;
		}
	}
}

namespace {
	use Arts\ImmersiveLightbox\Plugin;
	use Arts\ImmersiveLightbox\Tests\Support\KitManager;

	require_once dirname( __DIR__, 2 ) . '/vendor/autoload.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Plugin.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Options.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Elementor/Controls/UrlControl.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Elementor/UrlControlManager.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Elementor/CursorFollowerBridge.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/Elementor/KitLightboxSettings.php';
	require_once dirname( __DIR__, 2 ) . '/src/php/WooCommerce/ProductGallery.php';

	/** @param array<string, mixed> $settings */
	function arts_lightbox_test_kit( array $settings ): void {
		$plugin               = new \Elementor\Plugin();
		$plugin->kits_manager = new KitManager( $settings );
		\Elementor\Plugin::$instance = $plugin;
	}

	function arts_lightbox_test_reset(): void {
		$GLOBALS['arts_lightbox_test_actions']        = array();
		$GLOBALS['arts_lightbox_test_did_actions']    = array();
		$GLOBALS['arts_lightbox_test_filters']        = array();
		$GLOBALS['arts_lightbox_test_theme_supports'] = array();
		$GLOBALS['arts_lightbox_test_calls']          = array();
		$GLOBALS['arts_lightbox_test_captions']       = array();
		$GLOBALS['arts_lightbox_test_post_id']        = false;
		\Elementor\Plugin::$instance                 = null;
		unset( $GLOBALS['product'] );

		$instance = new \ReflectionProperty( Plugin::class, 'instance' );
		$instance->setValue( null, null );
	}
}
