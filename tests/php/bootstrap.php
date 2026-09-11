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

	/** @param array<string, mixed> $settings */
	function arts_lightbox_test_kit( array $settings ): void {
		$plugin               = new \Elementor\Plugin();
		$plugin->kits_manager = new KitManager( $settings );
		\Elementor\Plugin::$instance = $plugin;
	}

	function arts_lightbox_test_reset(): void {
		$GLOBALS['arts_lightbox_test_actions']     = array();
		$GLOBALS['arts_lightbox_test_did_actions'] = array();
		$GLOBALS['arts_lightbox_test_filters']     = array();
		\Elementor\Plugin::$instance              = null;

		$instance = new \ReflectionProperty( Plugin::class, 'instance' );
		$instance->setValue( null, null );
	}
}
