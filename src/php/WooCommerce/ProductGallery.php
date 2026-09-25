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

	private const NATIVE_CLASS = 'arts-lightbox-wc-native';

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

	private bool $removed_support = false;

	private bool $zoom_style_enqueued = false;

	private bool $needs_gallery_script = false;

	public function register(): void {
		// Ahead of WooCommerce's enqueue (10) and its block gallery's (20).
		add_action( 'wp_enqueue_scripts', array( $this, 'take_over' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'sweep' ), PHP_INT_MAX );
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
		$this->eligible ??= Plugin::instance()->is_enabled() && current_theme_supports( self::SUPPORT );

		return $this->eligible && ! $this->native_owns_gallery();
	}

	public function take_over(): void {
		if ( ! $this->is_taking_over() ) {
			return;
		}

		remove_theme_support( self::SUPPORT );
		$this->removed_support = ! current_theme_supports( self::SUPPORT );

		if ( current_theme_supports( self::ZOOM_SUPPORT ) ) {
			wp_register_style( self::ZOOM_STYLE_HANDLE, false, array(), null );
			wp_enqueue_style( self::ZOOM_STYLE_HANDLE );
			wp_add_inline_style( self::ZOOM_STYLE_HANDLE, self::ZOOM_CSS );
			$this->zoom_style_enqueued = true;
		}
	}

	/**
	 * A timely re-add of the theme support leaves WooCommerce's complete
	 * lightbox in charge, including its own click handler.
	 *
	 * @param mixed $enabled
	 * @return mixed
	 */
	public function filter_photoswipe_enabled( $enabled ) {
		return $this->is_taking_over() ? false : $enabled;
	}

	/**
	 * Backstop for paths that enqueue WooCommerce's PhotoSwipe outside the
	 * support check. A re-add that happened before WooCommerce's enqueue gets
	 * its complete lightbox. One that arrived after the enqueue cannot: remove
	 * that too-late support again so neither lightbox is left half-working.
	 */
	public function sweep(): void {
		if ( $this->native_owns_gallery() ) {
			if ( $this->zoom_style_enqueued ) {
				wp_dequeue_style( self::ZOOM_STYLE_HANDLE );
				$this->zoom_style_enqueued = false;
			}

			return;
		}

		if ( ! $this->is_taking_over() ) {
			return;
		}

		$this->ensure_gallery_script();

		if ( $this->removed_support && current_theme_supports( self::SUPPORT ) ) {
			remove_theme_support( self::SUPPORT );
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
	 * and video anchor without rewriting WooCommerce's markup. A native marker
	 * vetoes every claim when WooCommerce owns clicks.
	 *
	 * @param mixed $classes
	 * @return mixed
	 */
	public function mark_gallery_classes( $classes ) {
		if ( ! is_array( $classes ) ) {
			return $classes;
		}

		if ( $this->native_owns_gallery() ) {
			if ( ! in_array( self::NATIVE_CLASS, $classes, true ) ) {
				$classes[] = self::NATIVE_CLASS;
			}
		} elseif ( $this->is_taking_over() ) {
			if ( ! in_array( self::TAKEOVER_CLASS, $classes, true ) ) {
				$classes[] = self::TAKEOVER_CLASS;
			}
			$this->needs_gallery_script = true;
			$this->ensure_gallery_script();
		}

		return $classes;
	}

	/** WooCommerce has already queued the pieces its own gallery needs. */
	public function native_owns_gallery(): bool {
		if ( ! Plugin::instance()->is_enabled() || ! current_theme_supports( self::SUPPORT ) ) {
			return false;
		}

		$script_ready = wp_script_is( 'wc-photoswipe-ui-default', 'enqueued' ) || wp_script_is( 'wc-photoswipe-ui-default', 'done' );
		$style_ready  = wp_style_is( 'photoswipe-default-skin', 'enqueued' ) || wp_style_is( 'photoswipe-default-skin', 'done' );

		return $script_ready && $style_ready;
	}

	/**
	 * Legacy Product Image Gallery blocks skip wc-single-product if lightbox
	 * support was their only gallery feature. The script still initializes the
	 * gallery and releases its initial opacity: 0. A gallery can render before
	 * WooCommerce registers the handle, so sweep retries after its enqueue.
	 */
	private function ensure_gallery_script(): void {
		if (
			! $this->needs_gallery_script ||
			! wp_script_is( 'wc-single-product', 'registered' ) ||
			wp_script_is( 'wc-single-product', 'enqueued' ) ||
			wp_script_is( 'wc-single-product', 'done' )
		) {
			return;
		}

		wp_enqueue_script( 'wc-single-product' );
	}
}
