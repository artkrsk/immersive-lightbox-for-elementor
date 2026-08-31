<?php
/**
 * Corrections for vendor/arts/elementor-stubs/elementor-stubs.php, in two
 * flavors — both stating what the real Elementor source actually does, so a
 * call site can be typed honestly rather than worked around.
 *
 * Missing @return: an empty stub body with no docblock makes PHPStan infer
 * `void` and flag every call site that uses the result. Confirmed against
 * core/kits/manager.php that both Manager methods return a value.
 *
 * Loose array: a bare `array` carries no key type, so at level max anything
 * built on top of it stays `array<mixed>` however many string keys are added.
 * Confirmed against includes/controls/url.php that the returned literal is
 * keyed by strings throughout.
 */

namespace Elementor\Core\Kits;

class Manager {
	/** @return mixed */
	public function get_active_id() {}

	/**
	 * @param string|null $setting
	 * @return mixed
	 */
	public function get_current_settings( $setting = null ) {}
}

namespace Elementor;

class Control_URL {
	/** @return array<string, mixed> */
	protected function get_default_settings() {}
}
