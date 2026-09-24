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
 * product images; this is still a lightbox on product images.
 *
 * The switch is the theme support itself, removed for the request before
 * anything reads it. That is the one flag every WooCommerce path consults:
 * the classic enqueue, the footer root, the script's `photoswipe_enabled`
 * param and the block gallery's legacy assets. Filtering
 * `arts_immersive_lightbox/enabled` off hands the gallery straight back.
 */
class ProductGallery {

	private const SUPPORT = 'wc-product-gallery-lightbox';

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

	/** Memoized: the answer must outlive our own removal of the support. */
	private ?bool $taking_over = null;

	public function register(): void {
		// Ahead of WooCommerce's enqueue (10) and its block gallery's (20).
		add_action( 'wp_enqueue_scripts', array( $this, 'take_over' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'sweep' ), PHP_INT_MAX );
		add_action( 'wp_footer', array( $this, 'sweep' ), 1 );
		add_filter( 'woocommerce_single_product_photoswipe_enabled', array( $this, 'filter_photoswipe_enabled' ), PHP_INT_MAX );
		add_filter( 'woocommerce_single_product_image_thumbnail_html', array( $this, 'stamp_gallery_image' ), PHP_INT_MAX, 2 );
	}

	/**
	 * Evaluated first on `wp_enqueue_scripts`, while the support is still
	 * there. AJAX and REST renders never fire that hook, so there it is first
	 * evaluated by the stamping filter, against the support as declared.
	 */
	public function is_taking_over(): bool {
		return $this->taking_over ??= Plugin::instance()->is_enabled() && current_theme_supports( self::SUPPORT );
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
	 * A theme that forces the script flag on past the support still gets
	 * nothing to open: the flag would bind WooCommerce's click handlers to a
	 * PhotoSwipe that is no longer on the page.
	 *
	 * @param mixed $enabled
	 * @return mixed
	 */
	public function filter_photoswipe_enabled( $enabled ) {
		return $this->is_taking_over() ? false : $enabled;
	}

	/**
	 * Backstop for paths that enqueue WooCommerce's PhotoSwipe outside the
	 * support check. Only while the support is still removed: something that
	 * re-added it wants WooCommerce's lightbox, and must get it whole. A
	 * footer root without its stylesheet would print the stock sprite buttons
	 * at the bottom of the page.
	 */
	public function sweep(): void {
		if ( ! $this->is_taking_over() || current_theme_supports( self::SUPPORT ) ) {
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
	 * Opts each gallery image's anchor into our lightbox with the public
	 * vocabulary. Explicit on purpose: the kit's Image Lightbox switch governs
	 * Elementor's bare links, while this gallery had a lightbox because the
	 * theme asked for one. Only missing attributes are set, so markup a theme
	 * already stamps wins.
	 *
	 * @param mixed $html
	 * @param mixed $attachment_id
	 * @return mixed
	 */
	public function stamp_gallery_image( $html, $attachment_id ) {
		if ( ! is_string( $html ) || '' === $html || ! $this->is_taking_over() ) {
			return $html;
		}

		$tags = new \WP_HTML_Tag_Processor( $html );

		if ( ! $tags->next_tag( array( 'tag_name' => 'A' ) ) ) {
			return $html;
		}

		$href = $tags->get_attribute( 'href' );

		if ( ! is_string( $href ) || '' === $href || null !== $tags->get_attribute( 'data-arts-lightbox-off' ) ) {
			return $html;
		}

		foreach ( $this->gallery_attributes( is_numeric( $attachment_id ) ? (int) $attachment_id : 0 ) as $name => $value ) {
			if ( null === $tags->get_attribute( $name ) ) {
				$tags->set_attribute( $name, $value );
			}
		}

		return $tags->get_updated_html();
	}

	/**
	 * The group keeps one product's images together — they sit in separate
	 * wrappers, and ungrouped links would each open alone. Width and height
	 * are left to the engine: it upgrades guessed dimensions once the file
	 * loads, and stamped ones would go stale when a variation swaps the image
	 * client-side. The caption is the attachment's, which is what
	 * WooCommerce's own lightbox showed; without one the engine falls back to
	 * the image's alt, as for any other link.
	 *
	 * @return array<string, string|true>
	 */
	public function gallery_attributes( int $attachment_id ): array {
		$attributes = array( 'data-arts-lightbox' => true );

		$product_id = $this->product_id();

		if ( $product_id > 0 ) {
			$attributes['data-arts-lightbox-group'] = 'woocommerce-product-' . $product_id;
		}

		$caption = $attachment_id > 0 ? wp_get_attachment_caption( $attachment_id ) : false;
		$caption = is_string( $caption ) ? trim( wp_strip_all_tags( $caption ) ) : '';

		if ( '' !== $caption ) {
			$attributes['data-arts-lightbox-caption'] = $caption;
		}

		return $attributes;
	}

	/**
	 * WooCommerce sets the `product` global around every gallery render,
	 * AJAX re-renders of a variation's gallery included. The loop's post is
	 * the fallback for a template that renders the gallery without it.
	 */
	private function product_id(): int {
		$product = $GLOBALS['product'] ?? null;

		if ( is_object( $product ) && method_exists( $product, 'get_id' ) ) {
			$id = $product->get_id();

			return is_numeric( $id ) ? (int) $id : 0;
		}

		$id = get_the_ID();

		return is_int( $id ) ? $id : 0;
	}
}
