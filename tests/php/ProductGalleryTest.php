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

class ProductGalleryTest extends TestCase {
	private const IMAGE = '<div data-thumb="t.jpg" class="woocommerce-product-gallery__image"><a href="https://example.test/full.jpg"><img src="s.jpg" alt="Album"></a></div>';

	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_registers_ahead_of_woocommerce_and_last_on_its_filters(): void {
		( new ProductGallery() )->register();

		$actions = $GLOBALS['arts_lightbox_test_actions'];
		self::assertSame( array( 'take_over', 1 ), $this->hook( $actions['wp_enqueue_scripts'][0] ) );
		self::assertSame( array( 'sweep', PHP_INT_MAX ), $this->hook( $actions['wp_enqueue_scripts'][1] ) );
		self::assertSame( array( 'sweep', 1 ), $this->hook( $actions['wp_footer'][0] ) );

		$filters = $GLOBALS['arts_lightbox_test_filters'];
		self::assertArrayHasKey( PHP_INT_MAX, $filters['woocommerce_single_product_photoswipe_enabled'] );
		self::assertSame( 2, $filters['woocommerce_single_product_image_thumbnail_html'][ PHP_INT_MAX ][0][1] );
	}

	public function test_takes_over_by_removing_the_theme_support(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$gallery = new ProductGallery();

		$gallery->take_over();

		self::assertFalse( current_theme_supports( 'wc-product-gallery-lightbox' ) );
		// Still taking over: the verdict outlives our own removal.
		self::assertTrue( $gallery->is_taking_over() );
		self::assertFalse( $gallery->filter_photoswipe_enabled( true ) );
		self::assertSame( array(), arts_lightbox_test_calls( 'wp_add_inline_style' ) );
	}

	public function test_lets_clicks_through_the_zoom_overlay_in_a_layer_of_its_own(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		add_theme_support( 'wc-product-gallery-zoom' );

		( new ProductGallery() )->take_over();

		self::assertSame( array( array( 'immersive-lightbox-for-elementor-woocommerce', false ) ), arts_lightbox_test_calls( 'wp_register_style' ) );
		self::assertSame( array( array( 'immersive-lightbox-for-elementor-woocommerce' ) ), arts_lightbox_test_calls( 'wp_enqueue_style' ) );
		$css = arts_lightbox_test_calls( 'wp_add_inline_style' )[0][1];
		self::assertStringContainsString( '.woocommerce-product-gallery__image .zoomImg{pointer-events:none}', $css );
		// Naming our layer in <head> would fix its order ahead of our stylesheet.
		self::assertStringNotContainsString( '@layer arts-lightbox{', $css );
	}

	public function test_leaves_woocommerce_alone_while_the_plugin_is_disabled(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		arts_lightbox_test_filter( 'arts_immersive_lightbox/enabled', static fn(): bool => false );
		$gallery = new ProductGallery();

		$gallery->take_over();
		$gallery->sweep();

		self::assertTrue( current_theme_supports( 'wc-product-gallery-lightbox' ) );
		self::assertTrue( $gallery->filter_photoswipe_enabled( true ) );
		self::assertSame( self::IMAGE, $gallery->stamp_gallery_image( self::IMAGE, 7 ) );
		self::assertSame( array(), $GLOBALS['arts_lightbox_test_calls'] );
	}

	public function test_does_nothing_for_a_theme_without_the_lightbox(): void {
		add_theme_support( 'wc-product-gallery-zoom' );
		$gallery = new ProductGallery();

		$gallery->take_over();

		self::assertSame( array(), $GLOBALS['arts_lightbox_test_calls'] );
		self::assertSame( self::IMAGE, $gallery->stamp_gallery_image( self::IMAGE, 7 ) );
	}

	public function test_sweeps_every_photoswipe_handle_and_the_footer_root(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
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

	public function test_never_half_strips_a_lightbox_something_re_enabled(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$gallery = new ProductGallery();
		$gallery->take_over();
		add_theme_support( 'wc-product-gallery-lightbox' );

		$gallery->sweep();

		self::assertSame( array(), arts_lightbox_test_calls( 'wp_dequeue_style' ) );
		self::assertSame( array(), arts_lightbox_test_calls( 'remove_action' ) );
	}

	public function test_stamps_one_gallery_per_product_with_the_attachment_caption(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$GLOBALS['product']                         = new FakeProduct( 42 );
		$GLOBALS['arts_lightbox_test_captions'][7] = ' <em>Side A</em> ';

		$html = ( new ProductGallery() )->stamp_gallery_image( self::IMAGE, 7 );

		self::assertStringContainsString(
			'<a href="https://example.test/full.jpg" data-arts-lightbox data-arts-lightbox-group="woocommerce-product-42" data-arts-lightbox-caption="Side A">',
			$html
		);
		// The wrapper div and the image are left as they were.
		self::assertStringStartsWith( '<div data-thumb="t.jpg" class="woocommerce-product-gallery__image">', $html );
		self::assertStringEndsWith( '<img src="s.jpg" alt="Album"></a></div>', $html );
	}

	public function test_leaves_the_caption_to_the_engine_when_the_attachment_has_none(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$GLOBALS['product'] = new FakeProduct( 42 );

		$html = ( new ProductGallery() )->stamp_gallery_image( self::IMAGE, 7 );

		self::assertStringNotContainsString( 'data-arts-lightbox-caption', $html );
	}

	public function test_groups_by_the_loop_post_without_a_product_global(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$GLOBALS['arts_lightbox_test_post_id'] = 9;

		self::assertSame(
			array(
				'data-arts-lightbox'       => true,
				'data-arts-lightbox-group' => 'woocommerce-product-9',
			),
			( new ProductGallery() )->gallery_attributes( 7 )
		);
	}

	public function test_leaves_the_group_out_without_any_product(): void {
		self::assertSame( array( 'data-arts-lightbox' => true ), ( new ProductGallery() )->gallery_attributes( 0 ) );
	}

	public function test_keeps_what_the_markup_already_says(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$GLOBALS['product'] = new FakeProduct( 42 );
		$image              = '<div><a href="full.jpg" data-arts-lightbox-group="theme-set"><img src="s.jpg"></a></div>';

		$html = ( new ProductGallery() )->stamp_gallery_image( $image, 7 );

		self::assertStringContainsString( '<a href="full.jpg" data-arts-lightbox-group="theme-set" data-arts-lightbox>', $html );
	}

	public function test_skips_markup_it_cannot_or_must_not_stamp(): void {
		add_theme_support( 'wc-product-gallery-lightbox' );
		$gallery = new ProductGallery();

		foreach ( array(
			'<div class="woocommerce-product-gallery__image"><img src="s.jpg"></div>',
			'<div><a data-arts-lightbox-off href="full.jpg"><img src="s.jpg"></a></div>',
			'<div><a><img src="s.jpg"></a></div>',
			'',
		) as $image ) {
			self::assertSame( $image, $gallery->stamp_gallery_image( $image, 7 ) );
		}

		self::assertNull( $gallery->stamp_gallery_image( null, 7 ) );
	}

	public function test_plugin_wires_the_gallery_once_woocommerce_has_loaded(): void {
		arts_lightbox_test_did_action( 'woocommerce_loaded', 1 );

		Plugin::instance();

		self::assertArrayHasKey( 'woocommerce_single_product_image_thumbnail_html', $GLOBALS['arts_lightbox_test_filters'] );
	}

	public function test_plugin_waits_for_woocommerce_to_load(): void {
		Plugin::instance();

		self::assertArrayNotHasKey( 'woocommerce_single_product_image_thumbnail_html', $GLOBALS['arts_lightbox_test_filters'] );
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

class FakeProduct {
	public function __construct( private int $id ) {}

	public function get_id(): int {
		return $this->id;
	}
}
