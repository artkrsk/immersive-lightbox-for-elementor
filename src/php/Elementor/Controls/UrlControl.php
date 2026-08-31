<?php

namespace Arts\ImmersiveLightbox\Elementor\Controls;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Control_URL;

/**
 * Elementor's own URL control plus one checkbox: "Open in lightbox". Every
 * standard URL control is upgraded to this type, so any widget's link can
 * opt in without the custom-attributes recipe. The checkbox value rides the
 * control's own settings array (`arts_lightbox` => 'yes'), and the render
 * filter turns it into `data-arts-lightbox` on the matching anchor.
 *
 * The template is Elementor's Control_URL content_template with the one
 * option row added — the markup must track upstream's, since the editor's
 * Url view (which our editor bundle subclasses) binds by these classes.
 */
class UrlControl extends Control_URL {
	const TYPE = 'url_arts_lightbox';

	public function get_type(): string {
		return self::TYPE;
	}

	/**
	 * The badge the editor view pins beside the control's label while the
	 * checkbox is on — the popover it lives in is usually shut, so without
	 * this nothing on screen says the link opens in a lightbox.
	 *
	 * @return array<string, mixed>
	 */
	protected function get_default_settings(): array {
		$settings = parent::get_default_settings();

		$settings['arts_lightbox_badge'] = esc_html__( 'Lightbox', 'immersive-lightbox-for-elementor' );

		return $settings;
	}

	public function content_template(): void {
		?>
		<div class="elementor-control-field elementor-control-url-external-{{{ ( data.options.length || data.show_external ) ? 'show' : 'hide' }}}">
			<label for="<?php $this->print_control_uid(); ?>" class="elementor-control-title">{{{ data.label }}}</label>
			<div class="elementor-control-input-wrapper elementor-control-dynamic-switcher-wrapper">
				<i class="elementor-control-url-autocomplete-spinner eicon-loading eicon-animation-spin" aria-hidden="true"></i>
				<input id="<?php $this->print_control_uid(); ?>" class="elementor-control-tag-area elementor-input" data-setting="url" placeholder="{{ view.getControlPlaceholder() }}" />
				<?php // PHPCS - Nonces don't require escaping. ?>
				<input id="_ajax_linking_nonce" type="hidden" value="<?php echo wp_create_nonce( 'internal-linking' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" />
				<# if ( !! data.options ) { #>
				<button class="elementor-control-url-more tooltip-target elementor-control-unit-1" data-tooltip="<?php echo esc_attr__( 'Link Options', 'immersive-lightbox-for-elementor' ); ?>" aria-label="<?php echo esc_attr__( 'Link Options', 'immersive-lightbox-for-elementor' ); ?>">
					<i class="eicon-cog" aria-hidden="true"></i>
				</button>
				<# } #>
			</div>
			<# if ( !! data.options ) { #>
			<div class="elementor-control-url-more-options">
				<div class="elementor-control-url-option">
					<input id="<?php $this->print_control_uid( 'is_external' ); ?>" type="checkbox" class="elementor-control-url-option-input" data-setting="is_external">
					<label for="<?php $this->print_control_uid( 'is_external' ); ?>"><?php echo esc_html__( 'Open in new window', 'immersive-lightbox-for-elementor' ); ?></label>
				</div>
				<div class="elementor-control-url-option">
					<input id="<?php $this->print_control_uid( 'nofollow' ); ?>" type="checkbox" class="elementor-control-url-option-input" data-setting="nofollow">
					<label for="<?php $this->print_control_uid( 'nofollow' ); ?>"><?php echo esc_html__( 'Add nofollow', 'immersive-lightbox-for-elementor' ); ?></label>
				</div>
				<div class="elementor-control-url-option" data-option-key="arts_lightbox">
					<input id="<?php $this->print_control_uid( 'arts_lightbox' ); ?>" type="checkbox" class="elementor-control-url-option-input" data-setting="arts_lightbox">
					<label for="<?php $this->print_control_uid( 'arts_lightbox' ); ?>"><?php echo esc_html__( 'Open in lightbox', 'immersive-lightbox-for-elementor' ); ?></label>
				</div>
				<div class="elementor-control-url__custom-attributes elementor-control-direction-ltr">
					<label for="<?php $this->print_control_uid( 'custom_attributes' ); ?>" class="elementor-control-url__custom-attributes-label"><?php echo esc_html__( 'Custom Attributes', 'immersive-lightbox-for-elementor' ); ?></label>
					<input type="text" id="<?php $this->print_control_uid( 'custom_attributes' ); ?>" class="elementor-control-unit-5" placeholder="key|value" data-setting="custom_attributes">
				</div>
				<# if ( ( data.options && -1 !== data.options.indexOf( 'custom_attributes' ) ) && data.custom_attributes_description ) { #>
				<div class="elementor-control-field-description">{{{ data.custom_attributes_description }}}</div>
				<# } #>
			</div>
			<# } #>
		</div>
		<# if ( data.description ) { #>
		<div class="elementor-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
