<?php

declare( strict_types=1 );

namespace Arts\ImmersiveLightbox\Tests;

use Arts\ImmersiveLightbox\Options;
use PHPUnit\Framework\TestCase;

use function arts_lightbox_test_filter;
use function arts_lightbox_test_kit;
use function arts_lightbox_test_reset;

class OptionsTest extends TestCase {
	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_builds_the_full_engine_default_partial_without_an_elementor_kit(): void {
		self::assertSame(
			array(
				'transition' => array( 'preset' => 'curtain', 'edge' => 'straight', 'duration' => 800 ),
				'zoom'       => array( 'mode' => 'fill', 'level' => 3.0, 'wheelToZoom' => false ),
				'explore'    => array( 'enabled' => true ),
				'video'      => array( 'autoplay' => true ),
				'gallery'    => array( 'uniteAll' => false, 'loop' => true ),
				'ui'         => array(
					'counter'            => true,
					'thumbnails'         => false,
					'thumbnailsPosition' => 'bottom',
					'captions'           => true,
					'backdropOpacity'    => 1.0,
				),
				'elementor'  => array( 'nativeFallback' => true ),
			),
			Options::build()
		);
	}

	public function test_resolves_valid_kit_values_and_rejects_stale_or_malformed_ones(): void {
		arts_lightbox_test_kit(
			array(
				'arts_lightbox_preset'              => 'fade',
				'arts_lightbox_edge'                => 'curved',
				'arts_lightbox_duration'            => array( 'size' => '1150' ),
				'arts_lightbox_zoom'                => 'fit',
				'arts_lightbox_zoom_level'          => 2.5,
				'arts_lightbox_wheel_zoom'          => 'yes',
				'arts_lightbox_explore'             => '',
				'arts_lightbox_video_autoplay'      => 'no',
				'arts_lightbox_unite'               => 'yes',
				'arts_lightbox_loop'                => '',
				'lightbox_enable_counter'           => 'no',
				'arts_lightbox_thumbnails'          => 'yes',
				'arts_lightbox_thumbnails_position' => 'left',
				'arts_lightbox_captions'            => 'yes',
				'arts_lightbox_backdrop_opacity'    => '0.45',
				'global_image_lightbox'             => 'no',
			)
		);

		$options = Options::build();

		self::assertSame( array( 'preset' => 'fade', 'edge' => 'curved', 'duration' => 1150 ), $options['transition'] );
		self::assertSame( array( 'mode' => 'fit', 'level' => 2.5, 'wheelToZoom' => true ), $options['zoom'] );
		self::assertFalse( $options['explore']['enabled'] );
		self::assertFalse( $options['video']['autoplay'] );
		self::assertSame( array( 'uniteAll' => true, 'loop' => false ), $options['gallery'] );
		self::assertSame(
			array(
				'counter'            => false,
				'thumbnails'         => true,
				'thumbnailsPosition' => 'left',
				'captions'           => true,
				'backdropOpacity'    => 0.45,
			),
			$options['ui']
		);
		self::assertFalse( $options['elementor']['nativeFallback'] );

		arts_lightbox_test_kit(
			array(
				'arts_lightbox_preset'              => 'diagonal',
				'arts_lightbox_duration'            => array( 'size' => 'not-a-number' ),
				'arts_lightbox_thumbnails_position' => 'middle',
			)
		);
		$fallback = Options::build();

		self::assertSame( 'curtain', $fallback['transition']['preset'] );
		self::assertSame( 800, $fallback['transition']['duration'] );
		self::assertSame( 'bottom', $fallback['ui']['thumbnailsPosition'] );
	}

	public function test_honors_a_valid_options_filter_but_discards_an_invalid_filter_result(): void {
		arts_lightbox_test_filter(
			'arts_immersive_lightbox/options',
			static fn( array $options ): array => array( 'filtered' => $options['transition']['preset'] )
		);
		self::assertSame( array( 'filtered' => 'curtain' ), Options::build() );

		arts_lightbox_test_reset();
		arts_lightbox_test_filter(
			'arts_immersive_lightbox/options',
			static fn( array $options ): string => 'not an options array'
		);

		self::assertSame( 'curtain', Options::build()['transition']['preset'] );
	}
}
