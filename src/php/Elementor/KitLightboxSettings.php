<?php

namespace Arts\ImmersiveLightbox\Elementor;

use Arts\ImmersiveLightbox\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reuses Elementor's own Lightbox section in Site Settings rather than
 * inventing parallel controls: a user's existing styling survives
 * activation because the same pickers now also drive our engine. What the
 * native section has no equivalent for lands in our own sections, appended
 * to the same tab — one panel for everything about the lightbox.
 *
 * The extenders ride the section's before_section_end hook (inside it);
 * our sections open after_section_end (beside it). `update_control` always
 * passes `['recursive' => true]` — without it Elementor array_merges
 * shallowly and the injected key REPLACES `selectors`/`condition` wholesale
 * (controls.php, merge vs array_replace_recursive).
 */
class KitLightboxSettings {

	/**
	 * Elementor's own Lightbox tab id — our controls extend that section
	 * rather than adding a tab, so this is also the deep-link target for the
	 * Plugins-page Settings link.
	 */
	public const TAB_ID = 'settings-lightbox';

	private const ANCHOR = 'elementor/element/kit/section_settings-lightbox/after_section_end';

	private const ANCHOR_INSIDE = 'elementor/element/kit/section_settings-lightbox/before_section_end';

	/**
	 * Inside Arts Cursor Follower's own "Cursor Effects" section (it rides
	 * the same tab). The hook fires only when that plugin registered the
	 * section, so its existence is the presence check. The id goes into the
	 * hook verbatim — the `section_` in ANCHOR_INSIDE above is part of
	 * Elementor's own section id, not a pattern prefix.
	 */
	private const ANCHOR_CURSOR = 'elementor/element/kit/arts_cursor_section_lightbox/before_section_end';

	/**
	 * Controls that only configure Elementor's native chrome, which never
	 * renders while we own the click: fullscreen/zoom/share buttons and the
	 * two icon-size sliders (our chrome sizes independently).
	 */
	private const NATIVE_ONLY_CONTROLS = array(
		'lightbox_enable_fullscreen',
		'lightbox_enable_zoom',
		'lightbox_enable_share',
		'lightbox_icons_size',
		'lightbox_slider_icons_size',
	);

	public function register(): void {
		add_action( self::ANCHOR_INSIDE, array( $this, 'extend_style_selectors' ) );
		add_action( self::ANCHOR_INSIDE, array( $this, 'hide_native_only_controls' ) );
		add_action( self::ANCHOR, array( $this, 'register_sections' ) );
		add_action( self::ANCHOR_CURSOR, array( $this, 'extend_cursor_section' ) );
	}

	/**
	 * The follower's Cursor Effects section grows a second concern once we
	 * are on the page: its own three controls govern the OPEN lightbox, ours
	 * govern the links that lead there. Two headings split the section so
	 * both read as what they are; without this plugin the section keeps its
	 * shipped shape, three controls needing no grouping.
	 *
	 * The Hover Hint select is a behavior control — read by
	 * CursorFollowerBridge at options-build time, so it applies on the next
	 * front-end load. The wording rides `selectors` into kit CSS instead
	 * (the follower reads the var fresh per hover), which is what keeps the
	 * text editable live in the canvas.
	 *
	 * @param \Elementor\Controls_Stack $element
	 */
	public function extend_cursor_section( $element ): void {
		if ( ! Plugin::instance()->is_enabled() ) {
			return;
		}

		$element->add_control(
			'arts_lightbox_cursor_inside_heading',
			array(
				'label' => esc_html__( 'Inside the Lightbox', 'immersive-lightbox-for-elementor' ),
				'type'  => \Elementor\Controls_Manager::HEADING,
			),
			array(
				'position' => array(
					'at' => 'before',
					'of' => 'arts_cursor_lightbox',
				),
			)
		);

		$element->add_control(
			'arts_lightbox_cursor_links_heading',
			array(
				'label'     => esc_html__( 'Lightbox Links', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::HEADING,
				'separator' => 'before',
			)
		);

		$element->add_control(
			'arts_lightbox_cursor_hint',
			array(
				'label'       => esc_html__( 'Hover Hint', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'Applies on the next front-end load.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::SELECT,
				'default'     => 'zoom',
				'options'     => array(
					'none' => esc_html__( 'None', 'immersive-lightbox-for-elementor' ),
					'zoom' => esc_html__( 'Zoom Icon', 'immersive-lightbox-for-elementor' ),
					'plus' => esc_html__( 'Plus', 'immersive-lightbox-for-elementor' ),
					'text' => esc_html__( 'Text', 'immersive-lightbox-for-elementor' ),
				),
			)
		);

		$element->add_control(
			'arts_lightbox_cursor_hint_text',
			array(
				'label'       => esc_html__( 'Text', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'Empty keeps the default wording.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::TEXT,
				'placeholder' => esc_html__( 'View', 'immersive-lightbox-for-elementor' ),
				'condition'   => array( 'arts_lightbox_cursor_hint' => 'text' ),
				'selectors'   => array(
					':root' => '--arts-lightbox-cursor-label: "{{VALUE}}";',
				),
			)
		);
	}

	/**
	 * Our own controls, as sections appended to Elementor's Lightbox tab —
	 * everything about the lightbox stays in one panel. Registered only while
	 * we own the click: soft-disabled, the native lightbox is back and none of
	 * these would do anything.
	 *
	 * Two channels, deliberately: appearance rides `selectors` straight into
	 * kit CSS against the engine's public custom properties (previewing live
	 * in the editor for free), while behavior is read server-side by
	 * Options::build() and printed into the boot payload. A behavior control
	 * therefore applies on the next front-end load, not live in the canvas.
	 *
	 * @param \Elementor\Controls_Stack $element
	 */
	public function register_sections( $element ): void {
		if ( ! Plugin::instance()->is_enabled() ) {
			return;
		}

		$this->register_transition_section( $element );
		$this->register_interface_section( $element );
		$this->register_behavior_section( $element );
	}

	/** @param \Elementor\Controls_Stack $element */
	private function register_transition_section( $element ): void {
		$element->start_controls_section(
			'arts_lightbox_section_transition',
			array(
				'label' => esc_html__( 'Lightbox Transitions', 'immersive-lightbox-for-elementor' ),
				'tab'   => self::TAB_ID,
			)
		);

		$element->add_control(
			'arts_lightbox_preset',
			array(
				'label'   => esc_html__( 'Opening Style', 'immersive-lightbox-for-elementor' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => 'curtain',
				'options' => array(
					'curtain' => esc_html__( 'Curtain', 'immersive-lightbox-for-elementor' ),
					'fade'    => esc_html__( 'Fade', 'immersive-lightbox-for-elementor' ),
				),
			)
		);

		$element->add_control(
			'arts_lightbox_edge',
			array(
				'label'     => esc_html__( 'Curtain Edge', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => 'straight',
				'options'   => array(
					'straight' => esc_html__( 'Straight', 'immersive-lightbox-for-elementor' ),
					'curved'   => esc_html__( 'Curved', 'immersive-lightbox-for-elementor' ),
				),
				'condition' => array( 'arts_lightbox_preset' => 'curtain' ),
			)
		);

		$element->add_control(
			'arts_lightbox_duration',
			array(
				'label'      => esc_html__( 'Duration', 'immersive-lightbox-for-elementor' ),
				'type'       => \Elementor\Controls_Manager::SLIDER,
				'size_units' => array( 'ms' ),
				'range'      => array(
					'ms' => array(
						'min'  => 200,
						'max'  => 2000,
						'step' => 50,
					),
				),
				'default'    => array(
					'unit' => 'ms',
					'size' => 800,
				),
			)
		);

		$element->end_controls_section();
	}

	/** @param \Elementor\Controls_Stack $element */
	private function register_interface_section( $element ): void {
		$element->start_controls_section(
			'arts_lightbox_section_interface',
			array(
				'label' => esc_html__( 'Lightbox Interface', 'immersive-lightbox-for-elementor' ),
				'tab'   => self::TAB_ID,
			)
		);

		$element->add_control(
			'arts_lightbox_thumbnails',
			array(
				'label'   => esc_html__( 'Thumbnails', 'immersive-lightbox-for-elementor' ),
				'type'    => \Elementor\Controls_Manager::SWITCHER,
				'default' => '',
			)
		);

		$element->add_control(
			'arts_lightbox_thumbnails_position',
			array(
				'label'     => esc_html__( 'Thumbnails Position', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => 'bottom',
				'options'   => array(
					'bottom' => esc_html__( 'Bottom', 'immersive-lightbox-for-elementor' ),
					'top'    => esc_html__( 'Top', 'immersive-lightbox-for-elementor' ),
					'left'   => esc_html__( 'Left', 'immersive-lightbox-for-elementor' ),
					'right'  => esc_html__( 'Right', 'immersive-lightbox-for-elementor' ),
				),
				'condition' => array( 'arts_lightbox_thumbnails' => 'yes' ),
			)
		);

		$element->add_control(
			'arts_lightbox_captions',
			array(
				'label'     => esc_html__( 'Captions', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::SWITCHER,
				'default'   => 'yes',
				'separator' => 'before',
			)
		);

		// Appearance channel, like the radius below: Elementor prints the group
		// straight into kit CSS, unlayered, so it outranks our layered defaults
		// at any specificity — no property, no PHP round trip. No global default
		// on purpose: an empty group leaves the designed defaults in place. Two
		// groups for the two lines native shows — title and description — each
		// aimed at its own element so neither leaks into the other.
		$element->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			array(
				'name'      => 'arts_lightbox_caption_title_typography',
				'label'     => esc_html__( 'Title Typography', 'immersive-lightbox-for-elementor' ),
				'selector'  => '.pswp .arts-lightbox-caption__title',
				'condition' => array( 'arts_lightbox_captions' => 'yes' ),
			)
		);

		$element->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			array(
				'name'      => 'arts_lightbox_caption_description_typography',
				'label'     => esc_html__( 'Description Typography', 'immersive-lightbox-for-elementor' ),
				'selector'  => '.pswp .arts-lightbox-caption__description',
				'condition' => array( 'arts_lightbox_captions' => 'yes' ),
			)
		);

		// Counter Typography lives here rather than beside Elementor's own
		// Counter switch: injecting a popover group control with `position`
		// trips Elementor's end_popover() index lookup (it closes the popover
		// before the injection, while the injection counter is blind to the
		// controls/style_controls split it makes on front-end requests), which
		// emits an "Undefined array key" warning on every page load. Beside the
		// caption groups it needs no injection, and the three typography
		// controls read as one set. The condition still tracks Elementor's
		// switch — it drives our counter through Options::build().
		$element->add_group_control(
			\Elementor\Group_Control_Typography::get_type(),
			array(
				'name'      => 'arts_lightbox_counter_typography',
				'label'     => esc_html__( 'Counter Typography', 'immersive-lightbox-for-elementor' ),
				'selector'  => '.pswp .arts-lightbox-counter',
				'condition' => array( 'lightbox_enable_counter' => 'yes' ),
			)
		);

		$element->add_control(
			'arts_lightbox_backdrop_opacity',
			array(
				'label'   => esc_html__( 'Backdrop Opacity', 'immersive-lightbox-for-elementor' ),
				'type'    => \Elementor\Controls_Manager::SLIDER,
				'range'   => array(
					'px' => array(
						'min'  => 0,
						'max'  => 1,
						'step' => 0.05,
					),
				),
				'default' => array( 'size' => 1 ),
			)
		);

		// Appearance channel: straight into kit CSS, no PHP round trip.
		$element->add_control(
			'arts_lightbox_slide_radius',
			array(
				'label'      => esc_html__( 'Slide Corner Radius', 'immersive-lightbox-for-elementor' ),
				'type'       => \Elementor\Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min' => 0,
						'max' => 64,
					),
				),
				'selectors'  => array(
					'.pswp' => '--arts-lightbox-slide-radius: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$element->end_controls_section();
	}

	/** @param \Elementor\Controls_Stack $element */
	private function register_behavior_section( $element ): void {
		$element->start_controls_section(
			'arts_lightbox_section_behavior',
			array(
				'label' => esc_html__( 'Lightbox Behavior', 'immersive-lightbox-for-elementor' ),
				'tab'   => self::TAB_ID,
			)
		);

		$element->add_control(
			'arts_lightbox_loop',
			array(
				'label'   => esc_html__( 'Loop', 'immersive-lightbox-for-elementor' ),
				'type'    => \Elementor\Controls_Manager::SWITCHER,
				'default' => 'yes',
			)
		);

		$element->add_control(
			'arts_lightbox_unite',
			array(
				'label'       => esc_html__( 'Unite Galleries On This Page', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'Every gallery on the page becomes one, so navigation runs straight through from each into the next.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::SWITCHER,
				'default'     => '',
			)
		);

		// One answer to "what does zoom do here"; every control after it is a
		// refinement that only shows when it means something. A separate
		// on/off switch would fight "filling the screen", which IS a zoom state.
		$element->add_control(
			'arts_lightbox_zoom',
			array(
				'label'     => esc_html__( 'Zoom', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => 'fill',
				'options'   => array(
					'fill' => esc_html__( 'Filling the screen, click to see it whole', 'immersive-lightbox-for-elementor' ),
					'fit'  => esc_html__( 'Fully visible, click to zoom in', 'immersive-lightbox-for-elementor' ),
					'off'  => esc_html__( 'Off', 'immersive-lightbox-for-elementor' ),
				),
				'separator' => 'before',
			)
		);

		// Multiples of the fitted size, not absolute scales: "3×" means the
		// same thing for a phone snap and a 40-megapixel scan. One number for
		// click, double-tap, pinch and wheel alike — how far in zoom goes is
		// one question, whatever kicks it off.
		$element->add_control(
			'arts_lightbox_zoom_level',
			array(
				'label'       => esc_html__( 'Zoom Level', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'Times the fitted size, never past the image\'s own pixels.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::SLIDER,
				'size_units'  => array( 'x' ),
				'range'       => array(
					'x' => array(
						'min'  => 1,
						'max'  => 6,
						'step' => 0.5,
					),
				),
				'default'     => array(
					'unit' => 'x',
					'size' => 3,
				),
				'condition'   => array( 'arts_lightbox_zoom' => 'fit' ),
			)
		);

		$element->add_control(
			'arts_lightbox_wheel_zoom',
			array(
				'label'       => esc_html__( 'Mouse Wheel Zoom', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'The plain wheel zooms instead of moving between slides. Trackpad pinch always zooms.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::SWITCHER,
				'default'     => '',
				'condition'   => array( 'arts_lightbox_zoom!' => 'off' ),
			)
		);

		$element->add_control(
			'arts_lightbox_explore',
			array(
				'label'       => esc_html__( 'Explore Pan', 'immersive-lightbox-for-elementor' ),
				'description' => esc_html__( 'Moving the mouse pans a zoomed slide on desktop.', 'immersive-lightbox-for-elementor' ),
				'type'        => \Elementor\Controls_Manager::SWITCHER,
				'default'     => 'yes',
				'condition'   => array( 'arts_lightbox_zoom!' => 'off' ),
			)
		);

		$element->add_control(
			'arts_lightbox_video_autoplay',
			array(
				'label'     => esc_html__( 'Autoplay Videos', 'immersive-lightbox-for-elementor' ),
				'type'      => \Elementor\Controls_Manager::SWITCHER,
				'default'   => 'yes',
				'separator' => 'before',
			)
		);

		$element->end_controls_section();
	}

	/**
	 * Appends `.pswp`-scoped selectors to Elementor's style controls, mapping
	 * them onto the engine's public custom properties — one picker, both
	 * lightboxes. Not gated on the enabled verdict: when we are disabled our
	 * CSS never loads, so the extra rule in kit CSS targets nothing.
	 *
	 * All four color pickers map; the two icon-size sliders never will, since
	 * our chrome sizes itself independently of Elementor's toolbar metrics.
	 *
	 * @param \Elementor\Controls_Stack $element
	 */
	public function extend_style_selectors( $element ): void {
		$element->update_control(
			'lightbox_color',
			array(
				'selectors' => array(
					'.pswp' => '--arts-lightbox-backdrop-color: {{VALUE}};',
				),
			),
			array( 'recursive' => true )
		);

		// `:root` rather than `.pswp` for the two UI colors: the cursor follower
		// draws its magnet ring in them (CursorFollowerBridge::control_magnet),
		// and its root is mounted on body, outside `.pswp`, where a `.pswp`-scoped
		// property never reaches. Our own CSS only ever reads these through
		// `var()` fallbacks, so the chrome inherits them from `:root` unchanged.
		$element->update_control(
			'lightbox_ui_color',
			array(
				'selectors' => array(
					':root' => '--arts-lightbox-ui-color: {{VALUE}};',
				),
			),
			array( 'recursive' => true )
		);

		$element->update_control(
			'lightbox_ui_color_hover',
			array(
				'selectors' => array(
					':root' => '--arts-lightbox-ui-hover-color: {{VALUE}};',
				),
			),
			array( 'recursive' => true )
		);

		$element->update_control(
			'lightbox_text_color',
			array(
				'selectors' => array(
					'.pswp' => '--arts-lightbox-caption-color: {{VALUE}};',
				),
			),
			array( 'recursive' => true )
		);
	}

	/**
	 * Hides the native-only switches while we own the lightbox — showing
	 * settings that silently do nothing erodes trust in the ones that work.
	 * Gated on the enabled verdict: soft-disabled means the native lightbox
	 * renders again and these controls are real again.
	 *
	 * The condition references a settings key that never exists; Elementor
	 * treats a referenced-but-absent setting as unmet, so the control never
	 * shows. Values are untouched — deactivation restores the user's config.
	 *
	 * @param \Elementor\Controls_Stack $element
	 */
	public function hide_native_only_controls( $element ): void {
		if ( ! Plugin::instance()->is_enabled() ) {
			return;
		}

		foreach ( self::NATIVE_ONLY_CONTROLS as $control_id ) {
			$element->update_control(
				$control_id,
				array(
					'condition' => array( '_arts_immersive_lightbox_never' => 'yes' ),
				),
				array( 'recursive' => true )
			);
		}
	}
}
