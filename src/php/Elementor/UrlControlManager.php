<?php

namespace Arts\ImmersiveLightbox\Elementor;

use Arts\ImmersiveLightbox\Plugin;
use Elementor\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Upgrades every standard URL control to our lightbox-aware type, and turns
 * the saved checkbox into `data-arts-lightbox` on the rendered anchor.
 *
 * The upgrade is unconditional — the checkbox is harmless UI even while the
 * plugin is soft-disabled — but the render filter is gated on the enabled
 * verdict, so flipping the kill switch off also stops the attribute from
 * being stamped: disabled means the native behavior everywhere.
 *
 * Attribute injection is post-hoc string work on the rendered HTML (the
 * proven ArtsEnhancedURLControl approach): widgets print their anchors in
 * their own templates, so there is no render-attribute registry moment to
 * hook into generically.
 */
class UrlControlManager {

	public function register(): void {
		add_action( 'elementor/element/before_section_end', array( $this, 'upgrade_url_controls' ) );
		add_filter( 'elementor/widget/render_content', array( $this, 'inject_attribute' ), 10, 2 );
	}

	/** @param \Elementor\Controls_Stack $element */
	public function upgrade_url_controls( $element ): void {
		$controls = $element->get_controls();

		if ( ! is_array( $controls ) ) {
			return;
		}

		foreach ( $controls as $id => $control ) {
			if ( is_array( $control ) && isset( $control['type'] ) && Controls_Manager::URL === $control['type'] ) {
				$element->update_control( (string) $id, array( 'type' => Controls\UrlControl::TYPE ) );
			}
		}
	}

	/**
	 * Appends `data-arts-lightbox` to the anchor whose href matches a URL
	 * setting with the checkbox on. Runs in the editor canvas too, so what the
	 * canvas shows is what the front end renders — for the widgets Elementor
	 * renders through PHP at all; the ones drawn from a Backbone
	 * `content_template()` never reach this filter, and are served by the
	 * editor bundle's own pass instead.
	 *
	 * @param string                 $content
	 * @param \Elementor\Widget_Base $widget
	 */
	public function inject_attribute( $content, $widget ): string {
		if ( ! is_string( $content ) || '' === $content ) {
			return (string) $content;
		}

		if ( ! Plugin::instance()->is_enabled() ) {
			return $content;
		}

		// Never while Elementor builds `post_content`: `render_plain_content()`
		// is `render_content()` verbatim, so this filter fires while
		// `DB::save_plain_text()` assembles that string — and its stripping
		// pass drops `class` but keeps every `data-` attribute, which would
		// write our private vocabulary into a column we don't own, and into
		// every revision of it. `elementor/db/before_save` fires two lines
		// ahead of that call and is Elementor's own "inside a save" flag
		// (`DB::safe_copy_elementor_meta` reads it the same way).
		if ( did_action( 'elementor/db/before_save' ) ) {
			return $content;
		}

		$settings = $widget->get_settings_for_display();

		if ( ! is_array( $settings ) ) {
			return $content;
		}

		foreach ( $settings as $value ) {
			if ( ! is_array( $value ) || empty( $value['url'] ) || ! is_string( $value['url'] ) ) {
				continue;
			}
			if ( empty( $value['arts_lightbox'] ) || 'yes' !== $value['arts_lightbox'] ) {
				continue;
			}

			$escaped_url = preg_quote( esc_url( $value['url'] ), '/' );
			$pattern     = '/<a\b(?![^>]*\bdata-arts-lightbox\b)([^>]*?)href=["\']' . $escaped_url . '["\']/i';

			$replaced = preg_replace( $pattern, '<a data-arts-lightbox$1href="' . esc_url( $value['url'] ) . '"', $content );

			if ( is_string( $replaced ) ) {
				$content = $replaced;
			}
		}

		return $content;
	}
}
