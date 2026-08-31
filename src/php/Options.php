<?php

namespace Arts\ImmersiveLightbox;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Assembles the options payload the gate prints — a deep-partial of the
 * engine's IOptions shape, layered over the TS defaults client-side, so only
 * keys that diverge from those defaults belong here. Style-flavored kit
 * settings never pass through: Elementor prints them into kit CSS against
 * the engine's public --arts-lightbox-* custom properties.
 */
class Options {

	/** @return array<string, mixed> */
	public static function build(): array {
		$options = array(
			'transition' => array(
				'preset'   => self::choice( 'arts_lightbox_preset', array( 'curtain', 'fade' ), 'curtain' ),
				'edge'     => self::choice( 'arts_lightbox_edge', array( 'straight', 'curved' ), 'straight' ),
				'duration' => (int) self::size_of( 'arts_lightbox_duration', 800 ),
			),
			'zoom'       => array(
				'mode'        => self::choice( 'arts_lightbox_zoom', array( 'fill', 'fit', 'off' ), 'fill' ),
				'level'       => self::size_of( 'arts_lightbox_zoom_level', 3 ),
				'wheelToZoom' => self::is_on( 'arts_lightbox_wheel_zoom', false ),
			),
			'explore'    => array(
				// Only `enabled` travels: the payload is a deep-partial, so
				// `smoothing` keeps whatever the engine defaults call for.
				'enabled' => self::is_on( 'arts_lightbox_explore', true ),
			),
			'video'      => array(
				'autoplay' => self::is_on( 'arts_lightbox_video_autoplay', true ),
			),
			'gallery'    => array(
				'uniteAll' => self::is_on( 'arts_lightbox_unite', false ),
				'loop'     => self::is_on( 'arts_lightbox_loop', true ),
			),
			'ui'         => array(
				// Elementor's own counter switch drives our counter chrome — a
				// user's existing setting keeps meaning what it meant.
				'counter'            => self::is_on( 'lightbox_enable_counter', true ),
				'thumbnails'         => self::is_on( 'arts_lightbox_thumbnails', false ),
				'thumbnailsPosition' => self::choice(
					'arts_lightbox_thumbnails_position',
					array( 'bottom', 'top', 'left', 'right' ),
					'bottom'
				),
				'captions'           => self::is_on( 'arts_lightbox_captions', true ),
				'backdropOpacity'    => self::size_of( 'arts_lightbox_backdrop_opacity', 1 ),
			),
			'elementor'  => array(
				// The kit's own master switch, resolved server-side: with it on,
				// bare image links (no attributes at all) become candidates —
				// exactly the links Elementor's native lightbox would claim.
				'nativeFallback' => self::is_on( 'global_image_lightbox', true ),
			),
		);

		$filtered = apply_filters( 'arts_immersive_lightbox/options', $options );

		// A filter returning a non-array would corrupt the printed payload;
		// fall back to the unfiltered options instead of fataling the gate.
		if ( ! is_array( $filtered ) ) {
			return $options;
		}

		/** @var array<string, mixed> $filtered The filter contract: an options array keyed by option group. */
		return $filtered;
	}

	/**
	 * Raw kit value for a key. Null when Elementor is absent, or when the kit
	 * carries no control by that name — a registered one always resolves to
	 * something, its own default included.
	 */
	private static function kit_value( string $key ): mixed {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return null;
		}
		return \Elementor\Plugin::$instance->kits_manager->get_current_settings( $key );
	}

	/**
	 * Numeric kit value. Elementor's SLIDER stores `['unit' => …, 'size' => …]`;
	 * a bare number is accepted too, since a control retyped later would
	 * otherwise silently fall back.
	 */
	private static function size_of( string $key, float $default ): float {
		$value = self::kit_value( $key );

		if ( is_array( $value ) && isset( $value['size'] ) && is_numeric( $value['size'] ) ) {
			return (float) $value['size'];
		}

		return is_numeric( $value ) ? (float) $value : $default;
	}

	/**
	 * Kit value constrained to a known set — an unrecognized string (a stale
	 * saved value, a hand-edited kit) resolves to the default rather than
	 * reaching the engine, where it would land in a union type that cannot
	 * hold it.
	 *
	 * @param string[] $allowed
	 */
	private static function choice( string $key, array $allowed, string $default ): string {
		$value = self::kit_value( $key );

		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : $default;
	}

	private static function is_on( string $key, bool $default ): bool {
		$value = self::kit_value( $key );
		if ( null === $value || '' === $value ) {
			// '' is a switcher the user turned off. Null is a different thing: no
			// control by that name on the kit at all — a registered one resolves to
			// its own default whether or not it was ever saved — so there is no
			// choice of anybody's to honor.
			return null === $value ? $default : false;
		}
		return 'yes' === $value;
	}
}
