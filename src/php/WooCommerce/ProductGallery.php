<?php

namespace Arts\ImmersiveLightbox\WooCommerce;

use Arts\ImmersiveLightbox\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Takes WooCommerce's product gallery lightbox over.
 *
 * A theme that declares `wc-product-gallery-lightbox` gets WooCommerce's
 * bundled PhotoSwipe 4: its stylesheets, its scripts, and a `.pswp` root
 * printed in the footer. Both lightboxes share PhotoSwipe's class names, and
 * WooCommerce's CSS is unlayered, so it outranks our whole layer on our own
 * root (absolute positioning, z-index 1500, a 333ms transition on the zoom
 * wrap). Running both on one page cannot be made clean, so while the plugin
 * is enabled we switch WooCommerce's off and open the product gallery in
 * ours, as one gallery per product. The theme asked for a lightbox on
 * product media; images and enabled product videos still open as one gallery.
 *
 * The switch is the theme support itself, removed for the request before
 * anything reads it. That is the one flag every WooCommerce path consults:
 * the classic enqueue, the footer root, the script's `photoswipe_enabled`
 * param and the block gallery's legacy assets. Filtering
 * `arts_immersive_lightbox/enabled` off hands the gallery straight back.
 */
class ProductGallery {

	private const SUPPORT = 'wc-product-gallery-lightbox';

	private const TAKEOVER_CLASS = 'arts-lightbox-wc-gallery';

	private const ZOOM_SUPPORT = 'wc-product-gallery-zoom';

	private const ZOOM_STYLE_HANDLE = 'immersive-lightbox-for-elementor-woocommerce';

	/**
	 * jquery.zoom lays an absolutely positioned `img.zoomImg` over each gallery
	 * image, beside the anchor rather than inside it, so it takes every click.
	 * WooCommerce works around that with a magnifier trigger that only exists
	 * while its own lightbox does. Letting clicks through reaches the anchor,
	 * and the zoom keeps working: it listens on the wrapper, which the
	 * anchor's mouse events still bubble to.
	 *
	 * Its own layer, deliberately not ours: this prints in <head>, and naming
	 * `arts-lightbox` there would fix our layer's place in the layer order
	 * ahead of the stylesheet we load later.
	 */
	private const ZOOM_CSS = '@layer arts-lightbox-woocommerce{.woocommerce-product-gallery__image .zoomImg{pointer-events:none}}';

	/** Memoized before we remove the support ourselves. */
	private ?bool $eligible = null;

	public function register(): void {
		// Ahead of WooCommerce's enqueue (10) and its block gallery's (20).
		add_action( 'wp_enqueue_scripts', array( $this, 'take_over' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'sweep' ), PHP_INT_MAX );
		// Backstop for PhotoSwipe 4 styles enqueued during body render, before they print.
		add_action( 'wp_footer', array( $this, 'sweep' ), 1 );
		add_filter( 'woocommerce_single_product_photoswipe_enabled', array( $this, 'filter_photoswipe_enabled' ), PHP_INT_MAX );
		add_filter( 'woocommerce_single_product_image_gallery_classes', array( $this, 'mark_gallery_classes' ), PHP_INT_MAX );
	}

	/**
	 * Evaluated first on `wp_enqueue_scripts`, while the support is still
	 * there. AJAX and REST renders never fire that hook, so there it is first
	 * evaluated by the gallery-class filter, against the support as declared.
	 */
	public function is_taking_over(): bool {
		return $this->eligible ??= Plugin::instance()->is_enabled() && current_theme_supports( self::SUPPORT );
	}

	public function take_over(): void {
		if ( ! $this->is_taking_over() ) {
			return;
		}

		remove_theme_support( self::SUPPORT );

		if ( current_theme_supports( self::ZOOM_SUPPORT ) ) {
			wp_register_style( self::ZOOM_STYLE_HANDLE, false, array(), null );
			wp_enqueue_style( self::ZOOM_STYLE_HANDLE );
			wp_add_inline_style( self::ZOOM_STYLE_HANDLE, self::ZOOM_CSS );
		}
	}

	/**
	 * WooCommerce's script param: themes and the legacy gallery block force it
	 * on; held off while taking over so WooCommerce's click handler never binds.
	 *
	 * @param mixed $enabled
	 * @return mixed
	 */
	public function filter_photoswipe_enabled( $enabled ) {
		return $this->is_taking_over() ? false : $enabled;
	}

	/**
	 * Backstop for paths that enqueue WooCommerce's PhotoSwipe outside the
	 * support check.
	 */
	public function sweep(): void {
		if ( ! $this->is_taking_over() ) {
			return;
		}

		wp_dequeue_style( 'photoswipe-default-skin' );
		wp_dequeue_style( 'photoswipe' );

		// Current handles, then the legacy names WooCommerce still aliases.
		wp_dequeue_script( 'wc-photoswipe-ui-default' );
		wp_dequeue_script( 'wc-photoswipe' );
		wp_dequeue_script( 'photoswipe-ui-default' );
		wp_dequeue_script( 'photoswipe' );

		remove_action( 'wp_footer', 'woocommerce_photoswipe' );
	}

	/**
	 * One class on the gallery root lets the gate and engine find every image
	 * and video anchor without rewriting WooCommerce's markup.
	 *
	 * @param mixed $classes
	 * @return mixed
	 */
	public function mark_gallery_classes( $classes ) {
		if ( ! is_array( $classes ) || ! $this->is_taking_over() ) {
			return $classes;
		}

		if ( ! in_array( self::TAKEOVER_CLASS, $classes, true ) ) {
			$classes[] = self::TAKEOVER_CLASS;
		}

		// Legacy Product Image Gallery blocks skip wc-single-product when lightbox
		// was their only gallery feature, and that script is what releases the
		// gallery's initial opacity 0. Enqueued by handle: it prints once WooCommerce
		// has registered it, and a repeat enqueue is a no-op.
		wp_enqueue_script( 'wc-single-product' );

		return $classes;
	}
}
