<?php
/**
 * Plugin Name: Arts Better Lightbox for Elementor
 * Description: PhotoSwipe-powered lightbox for Elementor.
 * Version: 0.1.0
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.2
 * Requires PHP: 8.0
 * Requires Plugins: elementor
 * Text Domain: better-lightbox-for-elementor
 * Plugin URI: https://artemsemkin.com/plugins/better-lightbox-for-elementor/
 * Tested up to: 7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARTS_BETTER_LIGHTBOX_PLUGIN_VERSION', '0.1.0' );
define( 'ARTS_BETTER_LIGHTBOX_PLUGIN_FILE', __FILE__ );

// Phase 1 ships the frontend engine only; the WordPress bootstrap
// (printing, Elementor integration) arrives with phase 2.
