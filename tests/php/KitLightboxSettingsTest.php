<?php

declare( strict_types=1 );

namespace Arts\ImmersiveLightbox\Tests;

use Arts\ImmersiveLightbox\Elementor\KitLightboxSettings;
use Arts\ImmersiveLightbox\Tests\Support\ControlsStack;
use PHPUnit\Framework\TestCase;

use function arts_lightbox_test_filter;
use function arts_lightbox_test_reset;

class KitLightboxSettingsTest extends TestCase {
	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_registers_all_behavior_controls_in_the_lightbox_tab(): void {
		$stack = new ControlsStack();
		( new KitLightboxSettings() )->register_sections( $stack );

		$sections = array_map( static fn( array $call ): string => $call['args'][0], $stack->calls( 'start_controls_section' ) );
		self::assertSame(
			array(
				'arts_lightbox_section_transition',
				'arts_lightbox_section_interface',
				'arts_lightbox_section_behavior',
			),
			$sections
		);

		$controls = array_map( static fn( array $call ): string => $call['args'][0], $stack->calls( 'add_control' ) );
		foreach (
			array(
				'arts_lightbox_preset',
				'arts_lightbox_duration',
				'arts_lightbox_thumbnails',
				'arts_lightbox_backdrop_opacity',
				'arts_lightbox_slide_radius',
				'arts_lightbox_zoom',
				'arts_lightbox_wheel_zoom',
				'arts_lightbox_explore',
				'arts_lightbox_video_autoplay',
			) as $control
		) {
			self::assertContains( $control, $controls );
		}
	}

	public function test_maps_elementor_style_controls_to_the_public_css_custom_properties(): void {
		$stack = new ControlsStack();
		( new KitLightboxSettings() )->extend_style_selectors( $stack );

		$updates = $stack->calls( 'update_control' );
		self::assertSame(
			array(
				'lightbox_color'          => array( 'selectors' => array( '.pswp' => '--arts-lightbox-backdrop-color: {{VALUE}};' ) ),
				'lightbox_ui_color'       => array( 'selectors' => array( ':root' => '--arts-lightbox-ui-color: {{VALUE}};' ) ),
				'lightbox_ui_color_hover' => array( 'selectors' => array( ':root' => '--arts-lightbox-ui-hover-color: {{VALUE}};' ) ),
				'lightbox_text_color'     => array( 'selectors' => array( '.pswp' => '--arts-lightbox-caption-color: {{VALUE}};' ) ),
			),
			array_column( array_column( $updates, 'args' ), 1, 0 )
		);
		foreach ( $updates as $update ) {
			self::assertSame( array( 'recursive' => true ), $update['args'][2] );
		}
	}

	public function test_hides_native_only_controls_only_while_the_plugin_is_enabled(): void {
		$enabled = new ControlsStack();
		( new KitLightboxSettings() )->hide_native_only_controls( $enabled );
		self::assertCount( 5, $enabled->calls( 'update_control' ) );

		arts_lightbox_test_reset();
		arts_lightbox_test_filter( 'arts_immersive_lightbox/enabled', static fn(): bool => false );
		$disabled = new ControlsStack();
		( new KitLightboxSettings() )->hide_native_only_controls( $disabled );
		self::assertSame( array(), $disabled->calls( 'update_control' ) );
	}
}
