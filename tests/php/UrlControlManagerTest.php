<?php

declare( strict_types=1 );

namespace Arts\ImmersiveLightbox\Tests;

use Arts\ImmersiveLightbox\Elementor\UrlControlManager;
use Arts\ImmersiveLightbox\Tests\Support\ControlsStack;
use Arts\ImmersiveLightbox\Tests\Support\Widget;
use PHPUnit\Framework\TestCase;

use function arts_lightbox_test_did_action;
use function arts_lightbox_test_filter;
use function arts_lightbox_test_reset;

class UrlControlManagerTest extends TestCase {
	protected function setUp(): void {
		arts_lightbox_test_reset();
	}

	public function test_upgrades_only_standard_url_controls(): void {
		$stack = new ControlsStack(
			array(
				'link'  => array( 'type' => 'url' ),
				'title' => array( 'type' => 'text' ),
				'other' => 'not a control',
			)
		);

		( new UrlControlManager() )->upgrade_url_controls( $stack );

		self::assertSame(
			array(
				array(
					'method' => 'update_control',
					'args'   => array( 'link', array( 'type' => 'url_arts_lightbox' ), array() ),
				),
			),
			$stack->calls
		);
	}

	public function test_stamps_matching_opted_in_anchors_once_without_touching_others(): void {
		$manager = new UrlControlManager();
		$widget  = new Widget(
			array(
				'primary_link' => array( 'url' => 'https://example.test/full.jpg', 'arts_lightbox' => 'yes' ),
				'plain_link'   => array( 'url' => 'https://example.test/plain.jpg', 'arts_lightbox' => '' ),
			)
		);
		$content = '<a href="https://example.test/full.jpg">Full</a>'
			. '<a href="https://example.test/plain.jpg">Plain</a>'
			. '<a data-arts-lightbox href="https://example.test/full.jpg">Existing</a>';

		$actual = $manager->inject_attribute( $content, $widget );

		self::assertSame( 2, substr_count( $actual, 'data-arts-lightbox' ) );
		self::assertStringContainsString(
			'<a data-arts-lightbox href="https://example.test/full.jpg">Full</a>',
			$actual
		);
		self::assertStringContainsString( '<a href="https://example.test/plain.jpg">Plain</a>', $actual );
	}

	public function test_leaves_content_untouched_when_disabled_or_while_elementor_saves_plain_content(): void {
		$manager = new UrlControlManager();
		$widget  = new Widget(
			array( 'link' => array( 'url' => 'https://example.test/full.jpg', 'arts_lightbox' => 'yes' ) )
		);
		$content = '<a href="https://example.test/full.jpg">Full</a>';

		arts_lightbox_test_filter( 'arts_immersive_lightbox/enabled', static fn(): bool => false );
		self::assertSame( $content, $manager->inject_attribute( $content, $widget ) );

		arts_lightbox_test_reset();
		arts_lightbox_test_did_action( 'elementor/db/before_save', 1 );
		self::assertSame( $content, ( new UrlControlManager() )->inject_attribute( $content, $widget ) );
	}
}
