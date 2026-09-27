<?php

declare( strict_types=1 );

namespace Arts\ImmersiveLightbox\Tests;

use Arts\ImmersiveLightbox\Elementor\CursorFollowerBridge;
use PHPUnit\Framework\TestCase;

use function arts_lightbox_test_kit;
use function arts_lightbox_test_reset;

class CursorFollowerBridgeTest extends TestCase {
	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_appends_default_scopes_after_existing_scopes(): void {
		$options = ( new CursorFollowerBridge() )->add_scope(
			array( 'targetScopes' => array( array( 'scope' => '.existing', 'rules' => array() ) ) )
		);

		self::assertSame( array( '.existing', '.arts-lightbox-host > .pswp', 'body' ), array_column( $options['targetScopes'], 'scope' ) );
		$rules = $options['targetScopes'][1]['rules'];
		self::assertSame(
			array(
				':scope .arts-lightbox-arrow',
				':scope .arts-lightbox-close',
				':scope.arts-lightbox-draggable:not(.arts-lightbox-can-zoom) .pswp__img',
				':scope:not(.arts-lightbox-can-zoom) .pswp__img',
				':scope video.arts-lightbox-media',
				':scope .pswp__container',
			),
			array_column( $rules, 'selector' )
		);
		self::assertStringContainsString(
			'arts-lightbox-hint_zoom',
			$options['targetScopes'][2]['rules'][0]['payload']['icon']
		);
		self::assertTrue( $rules[5]['payload']['hideNativeCursor'] );
	}

	public function test_keeps_non_arrays_untouched_and_omits_optional_rules_when_the_kit_disables_them(): void {
		$bridge = new CursorFollowerBridge();
		self::assertSame( 'not options', $bridge->add_scope( 'not options' ) );

		arts_lightbox_test_kit(
			array(
				'arts_cursor_lightbox'      => '',
				'arts_cursor_lightbox_drag' => '',
				'arts_lightbox_cursor_hint' => 'none',
			)
		);
		$options = $bridge->add_scope( array() );

		self::assertSame( array( '.arts-lightbox-host > .pswp' ), array_column( $options['targetScopes'], 'scope' ) );
		self::assertSame(
			array(
				':scope:not(.arts-lightbox-can-zoom) .pswp__img',
				':scope video.arts-lightbox-media',
				':scope .pswp__container',
			),
			array_column( $options['targetScopes'][0]['rules'], 'selector' )
		);
	}

	/** @dataProvider hint_modes */
	public function test_builds_each_page_hint_variant( string $mode, string $expected_key, string $expected_value ): void {
		arts_lightbox_test_kit( array( 'arts_lightbox_cursor_hint' => $mode ) );
		$options = ( new CursorFollowerBridge() )->add_scope( array() );
		$hint    = $options['targetScopes'][1]['rules'][0];

		self::assertSame( ':scope .arts-lightbox-link', $hint['selector'] );
		self::assertStringContainsString( $expected_value, (string) $hint['payload'][ $expected_key ] );
	}

	/** @return array<string, array{string, string, string}> */
	public function hint_modes(): array {
		return array(
			'zoom' => array( 'zoom', 'icon', 'arts-lightbox-hint_zoom' ),
			'plus' => array( 'plus', 'icon', 'arts-lightbox-hint_plus' ),
			'text' => array( 'text', 'label', 'View' ),
		);
	}

	/** @dataProvider drag_styles */
	public function test_maps_cursor_follower_drag_styles( string $style, string $expected_key, string $expected_value ): void {
		arts_lightbox_test_kit( array( 'arts_cursor_lightbox_drag_style' => $style ) );
		$options = ( new CursorFollowerBridge() )->add_scope( array() );
		$payload = $options['targetScopes'][0]['rules'][2]['payload'];

		self::assertSame( $expected_value, $payload[ $expected_key ] );
	}

	/** @return array<string, array{string, string, string}> */
	public function drag_styles(): array {
		return array(
			'arrows' => array( 'arrows', 'arrows', 'horizontal' ),
			'always' => array( 'always', 'label', 'Drag' ),
			'label'  => array( 'label', 'label', 'Drag' ),
		);
	}
}
