<?php
/**
 * Plugin Name: Arts Immersive Lightbox for Elementor
 * Description: A PhotoSwipe lightbox that replaces Elementor's native one: cinematic transitions, mousemove explore pan, video galleries, any link as a trigger.
 * Version: 1.0.8
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.2
 * Requires PHP: 8.0
 * Requires Plugins: elementor
 * Text Domain: immersive-lightbox-for-elementor
 * Plugin URI: https://artemsemkin.com/plugins/immersive-lightbox-for-elementor/
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARTS_IMMERSIVE_LIGHTBOX_PLUGIN_VERSION', '1.0.8' );
define( 'ARTS_IMMERSIVE_LIGHTBOX_PLUGIN_FILE', __FILE__ );

require_once __DIR__ . '/vendor/autoload.php';

\Arts\ImmersiveLightbox\Plugin::instance();

// Elementor's caches cleared once per version. Wired here rather than in src/php, which
// can also ship inside a host product that has no copy of this prefixed class.
\ArtsImmersiveLightbox\Arts\Base\Elementor\CacheClear::on_version( 'immersive-lightbox', ARTS_IMMERSIVE_LIGHTBOX_PLUGIN_VERSION );
