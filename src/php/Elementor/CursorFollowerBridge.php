<?php

namespace Arts\ImmersiveLightbox\Elementor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Teaches Arts Cursor Follower about our chrome.
 *
 * That plugin ships three lightbox controls (Magnetic Navigation, Drag Hint
 * and its style) whose scope targets Elementor's native lightbox DOM —
 * `.elementor-lightbox`, `.elementor-swiper-button-*`, `.swiper-wrapper`.
 * None of it renders while we own the click, so with both plugins active
 * those controls govern nothing. We append a scope for our own DOM, read
 * from THEIR kit keys, so the settings a user already made keep meaning what
 * they say whichever lightbox is on the page.
 *
 * Inert without them: the filter simply never runs.
 */
class CursorFollowerBridge {

	public function register(): void {
		add_filter( 'arts_cursor_follower/options', array( $this, 'add_scope' ) );
	}

	/**
	 * Appends our scope LAST. Scope order is match priority in their engine
	 * (first match wins), and a root-level scope like ours must yield to the
	 * specific interactive rules registered before it.
	 *
	 * @param mixed $options
	 * @return mixed
	 */
	public function add_scope( $options ) {
		if ( ! is_array( $options ) ) {
			return $options;
		}

		$rules = $this->build_rules();

		if ( empty( $rules ) ) {
			return $options;
		}

		$scopes = isset( $options['targetScopes'] ) && is_array( $options['targetScopes'] )
			? $options['targetScopes']
			: array();

		$scopes[] = array(
			'scope' => '.pswp',
			'rules' => $rules,
		);

		$hint = $this->build_hint_rule();

		if ( null !== $hint ) {
			// After their per-widget hint scopes (which therefore keep winning
			// for widgets carrying their own Cursor Effects), and still ahead
			// of the engine's hardcoded interactive fallback — which is what
			// mode None deliberately falls back to.
			$scopes[] = array(
				'scope' => 'body',
				'rules' => array( $hint ),
			);
		}

		$options['targetScopes'] = $scopes;

		return $options;
	}

	/**
	 * The page-side hover hint: one rule against the marker class the gate
	 * stamps on every candidate link (`markCandidates`). Payload conventions
	 * copied from their own link-hint rules — `shape: pill` + `label`, no
	 * `hideNativeCursor` — duplicated rather than imported, same stance as
	 * the drag payloads below.
	 *
	 * @return array<string, mixed>|null Null when the kit says None.
	 */
	private function build_hint_rule(): ?array {
		$mode = $this->kit_value( 'arts_lightbox_cursor_hint' );

		if ( ! is_string( $mode ) || '' === $mode ) {
			// Nothing usable from the kit — normally no such control at all,
			// the follower being absent. Our own default stands in.
			$mode = 'zoom';
		}

		if ( 'text' === $mode ) {
			return array(
				'selector' => ':scope .arts-lightbox-link',
				'payload'  => array(
					'shape' => 'pill',
					'label' => __( 'View', 'immersive-lightbox-for-elementor' ),
				),
				// The kit's Hint Text control prints this var on :root; read
				// fresh per hover, so the wording edits live in the canvas.
				'labelVar' => '--arts-lightbox-cursor-label',
			);
		}

		if ( 'zoom' === $mode || 'plus' === $mode ) {
			return array(
				'selector' => ':scope .arts-lightbox-link',
				'payload'  => array( 'icon' => $this->hint_glyph( $mode ) ),
			);
		}

		return null;
	}

	/**
	 * Markup for the page hint, handed to the follower to draw inside its
	 * own element. Inline SVG, fully self-contained on purpose: it renders
	 * in FOREIGN DOM styled by whatever the page ships, and our stylesheet
	 * both lazy-loads with the engine and sits in a cascade layer built to
	 * lose to unlayered page CSS — a span-drawn version lost its border to a
	 * theme reset. Geometry rides attributes, ink rides `currentColor`, and
	 * `fill: none` is an inline STYLE because the follower's own
	 * `.arts-cursor__hint-icon svg { fill: currentcolor }` outranks a
	 * presentation attribute and would fill the ring into a disc. Height is
	 * governed by that same follower rule (their kit's Icon Size control);
	 * the width/height attributes only serve contexts without it.
	 *
	 * Not the in-lightbox zoom glyph in either variant: its cross state keys
	 * on `html:not(.arts-lightbox-over-image)`, true on every normal page.
	 *
	 * @param string $variant Either 'plus' or 'zoom'.
	 */
	private function hint_glyph( string $variant ): string {
		$shapes = 'plus' === $variant
			? '<path d="M12 5v14M5 12h14"/>'
			: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15.2 15.2 4.3 4.3"/>';

		return '<svg class="arts-lightbox-hint arts-lightbox-hint_' . $variant . '"'
			. ' viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"'
			. ' style="fill: none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
			. $shapes
			. '</svg>';
	}

	/** @return array<int, array<string, mixed>> */
	private function build_rules(): array {
		$rules = array();

		if ( $this->is_on( 'arts_cursor_lightbox', true ) ) {
			// No anchor redirection here, unlike their native-lightbox scope:
			// that one exists because Elementor's arrow is a viewport-wide strip
			// with the glyph pinned to its edge. Ours is a 56px button that IS
			// the glyph, so the magnet already lands where the user aims.
			//
			// These keep the OS cursor, deliberately: a button should look like
			// a button, and the magnet reads as the ring wrapping it rather
			// than as a second pointer. Only the slides below take it away,
			// where a glyph stands in its place.
			$rules[] = array(
				'selector' => ':scope .arts-lightbox-arrow',
				'payload'  => $this->control_magnet(),
			);
			$rules[] = array(
				'selector' => ':scope .arts-lightbox-close',
				'payload'  => $this->control_magnet(),
			);
		}

		$drags = $this->is_on( 'arts_cursor_lightbox_drag', true );

		// An image that cannot zoom answers a click with nothing, so it says
		// what it CAN do — drag, where a drag leads somewhere — and where it
		// can do nothing at all it says nothing. Both come before the slide
		// rule below, which would otherwise offer them the glyph.
		if ( $drags ) {
			$rules[] = array(
				'selector' => ':scope.arts-lightbox-draggable:not(.arts-lightbox-can-zoom) .pswp__img',
				'payload'  => $this->drawing_the_pointer( $this->drag_payload( $this->drag_style() ) ),
			);
		}

		$rules[] = array(
			'selector' => ':scope:not(.arts-lightbox-can-zoom) .pswp__img',
			'payload'  => $this->drawing_the_pointer( array() ),
		);

		// A video keeps the OS pointer, and is the one slide that does. Its
		// controls are real UI a person aims at — a glyph drawn over them is
		// in the way of the thing being clicked, and there is nothing for it
		// to promise anyway, since the click is the element's own behavior
		// rather than ours. Fullscreen settles it: the video moves to the top
		// layer and ::backdrop hides everything else in the document, this
		// cursor included, leaving a fullscreen video with no pointer at all.
		//
		// Empty rather than `drawing_the_pointer( array() )`, which is how an
		// unzoomable image says "nothing to promise": that one still hides the
		// native cursor, which is exactly what must not happen here. Ahead of
		// the slide rule below, which would otherwise claim it.
		$rules[] = array(
			'selector' => ':scope video.arts-lightbox-media',
			'payload'  => array(),
		);

		// ONE rule for the whole slide area — image and the space around it —
		// carrying ONE unchanging payload. The glyph it draws is three states
		// of the same two bars: a plus where a click zooms in, a minus where
		// it zooms out, a cross over the space beside the image where a click
		// closes. Which one shows is decided in CSS from state mirrored onto
		// <html> (`interaction/zoomCursor.ts`, `interaction/slideRegion.ts`),
		// never by swapping the payload — a follower resolves a rule when the
		// pointer crosses into a target and holds it, so a payload per state
		// went stale the moment the state changed under a still pointer, and
		// a payload per REGION would replace the markup and cut the morph.
		//
		// The drag hint rides along as a sub-payload rather than a rule of its
		// own, which could never match while this one does: pressing swaps the
		// glyph for the arrows, and states an empty icon to clear it.
		$rules[] = array(
			'selector' => ':scope .pswp__container',
			'payload'  => $this->drawing_the_pointer(
				array_merge(
					array( 'icon' => $this->zoom_glyph() ),
					$drags ? array( 'drag' => $this->drag_sub_payload() ) : array()
				)
			),
		);

		return $rules;
	}

	/**
	 * Every payload in this scope says the follower IS the pointer here.
	 *
	 * It reads as "hide the OS cursor", and does — though the stylesheet
	 * already takes that out of the whole lightbox, which a flag per rule
	 * could not (chrome no rule covers, and the first frame after entering,
	 * both left it showing). The reason it belongs on every payload is the
	 * other half: a label or an icon otherwise auto-nudges off the pointer to
	 * clear the OS cursor, and with no OS cursor to clear that nudge is just
	 * the drawn pointer sitting where the real one isn't — the glyph missing
	 * what it is aimed at.
	 *
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>
	 */
	private function drawing_the_pointer( array $payload ): array {
		return array_merge( $payload, array( 'hideNativeCursor' => true ) );
	}

	/**
	 * Their nav-control payload: magnet, and resize the cursor to wrap the
	 * button at whatever size it renders.
	 *
	 * The ring is meant to read as part of the button it wraps, not as the
	 * site's cursor sitting on top of it — so no fill, and the stroke in the
	 * chrome's own color. Payload colors land inline on their root and beat
	 * every kit setting, so a site whose cursor is a filled dark dot still
	 * gets a ring here. The value is the same var chain the chrome resolves on
	 * hover (`_ui.scss`): the magnet engages on pointerover, so the button is
	 * showing its hover color at the moment the ring draws it, and resolving
	 * in the browser is what makes an Elementor Global Color work. Their root
	 * lives on body, outside `.pswp` — which is why the kit prints these two
	 * properties on `:root` (`KitLightboxSettings::extend_style_selectors`).
	 * Border width is left to the site: their Magnetic → Border Width control
	 * keeps meaning something over our chrome.
	 *
	 * @return array<string, mixed>
	 */
	private function control_magnet(): array {
		return array(
			'magnetic'        => true,
			'scale'           => array(
				'ref'    => 'target',
				'factor' => 1.2,
				'min'    => '20px',
				'max'    => '70px',
			),
			'backgroundColor' => 'transparent',
			'borderColor'     => 'var(--arts-lightbox-ui-hover-color, var(--arts-lightbox-ui-color, #efece6))',
		);
	}

	/**
	 * Markup for the zoom glyph, handed to the follower to draw inside its own
	 * cursor. Two bars rather than a plus/minus icon font or an SVG pair: the
	 * shape has to CHANGE between states, and two elements can be transitioned
	 * into each other where a glyph swap can only cut. Same construction as
	 * our close button, for the same reason.
	 *
	 * Their icon channel takes author-trusted markup verbatim; this string is
	 * ours and carries no input.
	 */
	private function zoom_glyph(): string {
		return '<span class="arts-lightbox-zoom">'
			. '<span class="arts-lightbox-zoom__bar arts-lightbox-zoom__bar_1"></span>'
			. '<span class="arts-lightbox-zoom__bar arts-lightbox-zoom__bar_2"></span>'
			. '</span>';
	}

	/** The Drag Hint style the kit asks for, or the default it ships with. */
	private function drag_style(): string {
		$style = $this->kit_value( 'arts_cursor_lightbox_drag_style' );

		return is_string( $style ) ? $style : 'label';
	}

	/**
	 * The Drag Hint as a SUB-payload, for a rule that already states something
	 * else. Their drag payloads may not nest another `drag`, so the style's
	 * own one is dropped — it only re-states during-drag values a sub-payload
	 * is already living through. The empty icon clears whatever glyph the
	 * outer rule drew: their merge skips only `undefined`, so a stated empty
	 * string is a real clobber.
	 *
	 * @return array<string, mixed>
	 */
	private function drag_sub_payload(): array {
		$payload = $this->drag_payload( $this->drag_style() );

		unset( $payload['drag'] );

		return array_merge( $payload, array( 'icon' => '' ) );
	}

	/**
	 * Mirrors their Drag Hint styles. Duplicated rather than imported: their
	 * builder is private, and a hard dependency on another plugin's internals
	 * would break the moment it moves.
	 *
	 * @return array<string, mixed>
	 */
	private function drag_payload( string $style ): array {
		if ( 'arrows' === $style ) {
			return array(
				'shape'  => 'pill',
				'arrows' => 'horizontal',
				'dot'    => true,
				'drag'   => array( 'hideNativeCursor' => true ),
			);
		}

		if ( 'always' === $style ) {
			return array(
				'shape'  => 'pill',
				'label'  => __( 'Drag', 'immersive-lightbox-for-elementor' ),
				'arrows' => 'horizontal',
				'drag'   => array( 'arrows' => 'horizontal' ),
			);
		}

		return array(
			'shape' => 'pill',
			'label' => __( 'Drag', 'immersive-lightbox-for-elementor' ),
			'drag'  => array( 'arrows' => 'horizontal' ),
		);
	}

	/**
	 * Raw kit value for a key. Null when Elementor is absent, or when the kit
	 * carries no control by that name — a registered one always resolves to
	 * something, its own default included.
	 */
	private function kit_value( string $key ): mixed {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return null;
		}

		return \Elementor\Plugin::$instance->kits_manager->get_current_settings( $key );
	}

	/**
	 * Switchers store '' for off once touched. Null means the kit has no
	 * control by that name — the follower is absent — so our default stands.
	 */
	private function is_on( string $key, bool $default ): bool {
		$value = $this->kit_value( $key );

		if ( null === $value || '' === $value ) {
			return null === $value ? $default : false;
		}

		return 'yes' === $value;
	}
}
