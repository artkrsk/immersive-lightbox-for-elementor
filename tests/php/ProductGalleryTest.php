<?php

declare( strict_types=1 );

namespace Arts\ImmersiveLightbox\Tests;

use Arts\ImmersiveLightbox\Plugin;
use Arts\ImmersiveLightbox\WooCommerce\ProductGallery;
use PHPUnit\Framework\TestCase;

use function add_theme_support;
use function arts_lightbox_test_calls;
use function arts_lightbox_test_did_action;
use function arts_lightbox_test_filter;
use function arts_lightbox_test_reset;
use function current_theme_supports;
use function wp_style_is;

class ProductGalleryTest extends TestCase {
	private const SUPPORT = 'wc-product-gallery-lightbox';

	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_registers_before_woocommerce_and_marks_the_gallery_root(): void {
		( new ProductGallery() )->register();

		$actions = $GLOBALS['arts_lightbox_test_actions'];
		self::assertSame( array( 'take_over', 1 ), $this->hook( $actions['wp_enqueue_scripts'][0] ) );
		self::assertSame( array( 'sweep', PHP_INT_MAX ), $this->hook( $actions['wp_enqueue_scripts'][1] ) );
		self::assertSame( array( 'sweep', 1 ), $this->hook( $actions['wp_footer'][0] ) );

		$filters = $GLOBALS['arts_lightbox_test_filters'];
		self::assertArrayHasKey( PHP_INT_MAX, $filters['woocommerce_single_product_photoswipe_enabled'] );
		self::assertArrayHasKey( PHP_INT_MAX, $filters['woocommerce_single_product_image_gallery_classes'] );
		self::assertArrayNotHasKey( 'woocommerce_single_product_image_thumbnail_html', $filters );
	}

	public function test_marks_one_gallery_root_without_rewriting_its_images(): void {
		add_theme_support( self::SUPPORT );
		$gallery = new ProductGallery();
		$gallery->take_over();

		self::assertFalse( current_theme_supports( self::SUPPORT ) );
		self::assertTrue( $gallery->is_taking_over() );
		self::assertFalse( $gallery->filter_photoswipe_enabled( true ) );
		self::assertSame(
			array( 'woocommerce-product-gallery', 'arts-lightbox-wc-gallery' ),
			$gallery->mark_gallery_classes( array( 'woocommerce-product-gallery' ) )
		);
		self::assertSame( array(), arts_lightbox_test_calls( 'wp_add_inline_style' ) );
	}

	public function test_marks_ajax_gallery_markup_before_enqueue_has_run(): void {
		add_theme_support( self::SUPPORT );
		$gallery = new ProductGallery();

		self::assertSame( array( 'arts-lightbox-wc-gallery' ), $gallery->mark_gallery_classes( array() ) );
		self::assertTrue( current_theme_supports( self::SUPPORT ) );
	}

	public function test_enqueues_the_legacy_gallery_initializer_only_for_a_taken_over_gallery(): void {
		( new ProductGallery() )->mark_gallery_classes( array() );
		self::assertSame( array(), arts_lightbox_test_calls( 'wp_enqueue_script' ) );

		add_theme_support( self::SUPPORT );
		$gallery = new ProductGallery();
		$gallery->take_over();

		self::assertSame( array( 'arts-lightbox-wc-gallery' ), $gallery->mark_gallery_classes( array() ) );
		self::assertSame( array( array( 'wc-single-product' ) ), arts_lightbox_test_calls( 'wp_enqueue_script' ) );
	}

	public function test_lets_clicks_through_zoom_only_during_takeover(): void {
		add_theme_support( self::SUPPORT );
		add_theme_support( 'wc-product-gallery-zoom' );
		$gallery = new ProductGallery();
		$gallery->take_over();

		self::assertSame( array( array( 'immersive-lightbox-for-elementor-woocommerce', false ) ), arts_lightbox_test_calls( 'wp_register_style' ) );
		self::assertTrue( wp_style_is( 'immersive-lightbox-for-elementor-woocommerce' ) );
		$css = arts_lightbox_test_calls( 'wp_add_inline_style' )[0][1];
		self::assertStringContainsString( '.woocommerce-product-gallery__image .zoomImg{pointer-events:none}', $css );
		self::assertStringNotContainsString( '@layer arts-lightbox{', $css );
	}

	public function test_leaves_woocommerce_alone_while_the_plugin_is_disabled(): void {
		add_theme_support( self::SUPPORT );
		arts_lightbox_test_filter( 'arts_immersive_lightbox/enabled', static fn(): bool => false );
		$gallery = new ProductGallery();
		$classes = array( 'woocommerce-product-gallery' );

		$gallery->take_over();
		$gallery->sweep();

		self::assertTrue( current_theme_supports( self::SUPPORT ) );
		self::assertTrue( $gallery->filter_photoswipe_enabled( true ) );
		self::assertSame( $classes, $gallery->mark_gallery_classes( $classes ) );
		self::assertSame( array(), $GLOBALS['arts_lightbox_test_calls'] );
	}

	public function test_does_nothing_without_theme_lightbox_support(): void {
		add_theme_support( 'wc-product-gallery-zoom' );
		$gallery = new ProductGallery();

		$gallery->take_over();

		self::assertSame( array(), $gallery->mark_gallery_classes( array() ) );
		self::assertSame( array(), $GLOBALS['arts_lightbox_test_calls'] );
	}

	public function test_sweeps_woocommerce_assets_and_footer_root_when_we_win(): void {
		add_theme_support( self::SUPPORT );
		$gallery = new ProductGallery();
		$gallery->take_over();
		$gallery->sweep();

		self::assertSame( array( array( 'photoswipe-default-skin' ), array( 'photoswipe' ) ), arts_lightbox_test_calls( 'wp_dequeue_style' ) );
		self::assertSame(
			array( array( 'wc-photoswipe-ui-default' ), array( 'wc-photoswipe' ), array( 'photoswipe-ui-default' ), array( 'photoswipe' ) ),
			arts_lightbox_test_calls( 'wp_dequeue_script' )
		);
		self::assertSame( array( array( 'wp_footer', 'woocommerce_photoswipe', 10 ) ), arts_lightbox_test_calls( 'remove_action' ) );
	}

	public function test_preserves_non_array_gallery_class_filter_values(): void {
		add_theme_support( self::SUPPORT );
		self::assertSame( 'custom', ( new ProductGallery() )->mark_gallery_classes( 'custom' ) );
	}

	public function test_plugin_wires_the_gallery_once_woocommerce_has_loaded(): void {
		arts_lightbox_test_did_action( 'woocommerce_loaded', 1 );
		Plugin::instance();
		self::assertArrayHasKey( 'woocommerce_single_product_image_gallery_classes', $GLOBALS['arts_lightbox_test_filters'] );
	}

	public function test_plugin_waits_for_woocommerce_to_load(): void {
		Plugin::instance();
		self::assertArrayNotHasKey( 'woocommerce_single_product_image_gallery_classes', $GLOBALS['arts_lightbox_test_filters'] );
		self::assertSame( 'init_woocommerce', $this->hook( $GLOBALS['arts_lightbox_test_actions']['woocommerce_loaded'][0] )[0] );
	}

	/**
	 * @param array{0: mixed, 1: int, 2: int} $registration
	 * @return array{0: string, 1: int}
	 */
	private function hook( array $registration ): array {
		$callback = $registration[0];
		self::assertIsArray( $callback );

		return array( (string) $callback[1], $registration[1] );
	}
}
