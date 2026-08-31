<?php
/**
 * Seeds the "Arts Immersive Lightbox — Demo" page: the Live Preview landing
 * page on WordPress.org and the page this plugin is judged by.
 *
 * Run against the Local dev site:
 *   dev/wp eval-file dev/seed/demo-page.php --user=1
 *
 * Also inlined into .wordpress-org/blueprints/blueprint.json as a writeFile
 * step by `arts-wp blueprint build`, then required from the runPHP step that
 * follows it (no wp-cli context there — the WP_CLI:: calls below are guarded
 * for that reason). Idempotent: finds the page by slug and rewrites it
 * wholesale; the slide attachments are keyed on a meta value and reused.
 *
 * The slides are SVG compositions embedded below. The blueprint cannot fetch
 * assets (wp.org's SVN serves no CORS headers), and vector stays crisp at any
 * explore-pan zoom. WordPress does not count .svg as an image
 * (wp_attachment_is_image), so each attachment's metadata carries a
 * `sizes.full` entry — the one branch of image_downsize() that lets a
 * non-image through — which is what makes [gallery] and the Image widget
 * render them at all.
 *
 * The lightbox runs on kit defaults plus one flipped switch (thumbnails). The
 * widgets carry the same settings the panel would save, nothing hand-wired.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pinned so the blueprint's landingPage can address the page without guessing.
 * The blueprint generator regexes this constant out of the file — keep the
 * literal on one line.
 */
define( 'AIL_DEMO_PAGE_ID', 9942 );

// Elementor otherwise hijacks the first admin request with its onboarding
// wizard. Harmless on an already-onboarded dev site.
update_option( 'elementor_onboarded', true );
delete_transient( 'elementor_activation_redirect' );

// update_option( 'blogname' ) below forward-syncs into the Elementor kit
// through Elementor's own update_option_blogname hook, and that kit save
// runs a capability check ("Access denied" in the blueprint's userless
// runPHP context otherwise).
wp_set_current_user( 1 );

const AIL_TEXT  = '#111111';
const AIL_MUTED = '#6b6b6b';

function ail_seed_id(): string {
	return substr( bin2hex( random_bytes( 4 ) ), 0, 7 );
}

function ail_zero_gap(): array {
	return array(
		'unit'     => 'px',
		'column'   => '0',
		'row'      => '0',
		'isLinked' => true,
	);
}

function ail_gap( int $px ): array {
	return array(
		'unit'     => 'px',
		'column'   => (string) $px,
		'row'      => (string) $px,
		'isLinked' => true,
	);
}

/** Heading widget with explicit typography (the blueprint boots a bare kit). */
function ail_heading( string $title, string $tag, string $font_size, array $extra = array() ): array {
	return array(
		'id'         => ail_seed_id(),
		'elType'     => 'widget',
		'widgetType' => 'heading',
		'settings'   => array_merge(
			array(
				'title'                     => $title,
				'header_size'               => $tag,
				'title_color'               => AIL_TEXT,
				'typography_typography'     => 'custom',
				'typography_font_weight'    => '600',
				'typography_font_size'      => array(
					'unit' => 'custom',
					'size' => $font_size,
				),
				'typography_line_height'    => array(
					'unit' => 'custom',
					'size' => '1.2',
				),
				'typography_letter_spacing' => array(
					'unit'  => 'em',
					'size'  => -0.01,
					'sizes' => array(),
				),
			),
			$extra
		),
		'elements'   => array(),
	);
}

/** Muted body paragraph, capped at a readable measure. */
function ail_body( string $title, array $extra = array() ): array {
	return array(
		'id'         => ail_seed_id(),
		'elType'     => 'widget',
		'widgetType' => 'heading',
		'settings'   => array_merge(
			array(
				'title'                  => $title,
				'header_size'            => 'p',
				'title_color'            => AIL_MUTED,
				'typography_typography'  => 'custom',
				'typography_font_size'   => array(
					'unit'  => 'px',
					'size'  => 17,
					'sizes' => array(),
				),
				'typography_line_height' => array(
					'unit' => 'custom',
					'size' => '1.65',
				),
				'_element_width'         => 'initial',
				'_element_custom_width'  => array(
					'unit' => 'custom',
					'size' => 'min(54ch, 100%)',
				),
			),
			$extra
		),
		'elements'   => array(),
	);
}

/** Small hint line under a showcase: 14px, a little air above. */
function ail_hint( string $title ): array {
	return ail_body(
		$title,
		array(
			'typography_font_size' => array(
				'unit'  => 'px',
				'size'  => 14,
				'sizes' => array(),
			),
			'_margin'              => array(
				'unit'     => 'px',
				'top'      => '8',
				'right'    => '0',
				'bottom'   => '0',
				'left'     => '0',
				'isLinked' => false,
			),
		)
	);
}

/**
 * Pill button: hairline border, fully rounded, inverts on hover. $link is the
 * URL control's value verbatim — pass 'arts_lightbox' => 'yes' in it and the
 * plugin's render filter stamps data-arts-lightbox on the anchor, exactly as
 * ticking "Open in lightbox" in the panel would.
 */
function ail_pill( string $text, array $link, array $extra = array() ): array {
	return array(
		'id'         => ail_seed_id(),
		'elType'     => 'widget',
		'widgetType' => 'button',
		'settings'   => array_merge(
			array(
				'text'                               => $text,
				'link'                               => $link,
				'button_text_color'                  => AIL_TEXT,
				// Group_Control_Background defaults to the kit's global accent
				// color when unset — explicit so the pill stays transparent.
				'background_background'              => 'classic',
				'background_color'                   => 'transparent',
				'border_border'                      => 'solid',
				'border_width'                       => array(
					'unit'     => 'px',
					'top'      => '1',
					'right'    => '1',
					'bottom'   => '1',
					'left'     => '1',
					'isLinked' => true,
				),
				'border_color'                       => AIL_TEXT,
				'border_radius'                      => array(
					'unit'     => 'px',
					'top'      => '999',
					'right'    => '999',
					'bottom'   => '999',
					'left'     => '999',
					'isLinked' => true,
				),
				'text_padding'                       => array(
					'unit'     => 'px',
					'top'      => '10',
					'right'    => '22',
					'bottom'   => '10',
					'left'     => '22',
					'isLinked' => false,
				),
				'typography_typography'              => 'custom',
				'typography_font_size'               => array(
					'unit'  => 'px',
					'size'  => 15,
					'sizes' => array(),
				),
				'typography_font_weight'             => '500',
				'hover_color'                        => '#ffffff',
				'button_background_hover_background' => 'classic',
				'button_background_hover_color'      => AIL_TEXT,
				'button_hover_border_color'          => AIL_TEXT,
				'_element_width'                     => 'auto',
			),
			$extra
		),
		'elements'   => array(),
	);
}

/**
 * Inner structural container. Explicit zero padding + gap: the kit's default
 * container padding and --widgets-spacing (20px) would leak in otherwise.
 */
function ail_row( array $settings, array $children ): array {
	return array(
		'id'       => ail_seed_id(),
		'elType'   => 'container',
		'settings' => array_merge(
			array(
				'content_width' => 'full',
				'padding'       => array(
					'unit'     => 'px',
					'top'      => '0',
					'right'    => '0',
					'bottom'   => '0',
					'left'     => '0',
					'isLinked' => true,
				),
				'flex_gap'      => ail_zero_gap(),
			),
			$settings
		),
		'elements' => $children,
	);
}

/** Content section: single column, generous vertical padding, anchor id. */
function ail_section( string $anchor, array $children, array $extra = array() ): array {
	return ail_row(
		array_merge(
			array(
				'_element_id'    => $anchor,
				'flex_direction' => 'column',
				'flex_gap'       => ail_gap( 12 ),
				'padding'        => array(
					'unit'     => 'px',
					'top'      => '96',
					'right'    => '0',
					'bottom'   => '96',
					'left'     => '0',
					'isLinked' => false,
				),
			),
			$extra
		),
		$children
	);
}

/**
 * Basic Gallery widget — the stock Elementor gallery, linking to the media
 * files with the lightbox on. Elementor groups its items into one slideshow
 * and stamps title/description on every link; the plugin reads both.
 */
function ail_gallery( array $ids ): array {
	$items = array();
	foreach ( $ids as $id ) {
		$items[] = array(
			'id'  => $id,
			'url' => wp_get_attachment_url( $id ),
		);
	}

	return array(
		'id'         => ail_seed_id(),
		'elType'     => 'widget',
		'widgetType' => 'image-gallery',
		'settings'   => array(
			'wp_gallery'           => $items,
			'thumbnail_size'       => 'medium',
			'gallery_columns'      => '3',
			'gallery_link'         => 'file',
			'open_lightbox'        => 'yes',
			'image_spacing'        => 'custom',
			'image_spacing_custom' => array(
				'unit'  => 'px',
				'size'  => 12,
				'sizes' => array(),
			),
		),
		'elements'   => array(),
	);
}

/** Image widget linking to its own media file with the lightbox on. */
function ail_image( int $id ): array {
	return array(
		'id'         => ail_seed_id(),
		'elType'     => 'widget',
		'widgetType' => 'image',
		'settings'   => array(
			'image'         => array(
				'id'  => $id,
				'url' => wp_get_attachment_url( $id ),
			),
			'image_size'    => 'full',
			// Elementor sizes an SVG inside an image-widget link to 48px
			// (widget-image.css: a img[src$=".svg"]); the width control's
			// wrapper-scoped selector outranks that rule.
			'width'         => array(
				'unit'  => '%',
				'size'  => 100,
				'sizes' => array(),
			),
			'link_to'       => 'file',
			'open_lightbox' => 'yes',
		),
		'elements'   => array(),
	);
}

// --- Slide attachments ----------------------------------------------------------

$ail_fail = static function ( string $message ): void {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		WP_CLI::error( $message );
	}
	throw new RuntimeException( $message );
};

$upload = wp_upload_dir();

if ( ! empty( $upload['error'] ) ) {
	$ail_fail( $upload['error'] );
}

/**
 * Writes an SVG into uploads and registers it as an attachment, reusing one
 * previously created under the same key.
 *
 * SVG is not on WordPress's mime whitelist, so the media uploader is bypassed:
 * inserting the attachment directly skips the whitelist (it only guards
 * uploads). Metadata is hand-written because generate_attachment_metadata()
 * would hand the file to the image editor, which cannot measure an SVG. The
 * `sizes.full` entry is load-bearing: wp_attachment_is_image() is false for
 * .svg, and image_downsize() serves a non-image only through that entry —
 * without it [gallery] and wp_get_attachment_image() print nothing.
 *
 * Title and description become the lightbox caption lines: Elementor resolves
 * its lightbox_title_src / lightbox_description_src kit settings (defaults:
 * title, description) into data attributes on the link, and the plugin reads
 * those.
 */
$ail_attach = static function (
	string $key,
	string $filename,
	string $bytes,
	string $title,
	string $description,
	int $width,
	int $height
) use (
	$upload,
	$ail_fail
): int {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 1,
			'meta_key'       => '_arts_il_asset',
			'meta_value'     => $key,
			'fields'         => 'ids',
		)
	);

	$target = "{$upload['path']}/{$filename}";

	if ( false === file_put_contents( $target, $bytes ) ) {
		$ail_fail( "Could not write {$target}" );
	}

	$relative = ltrim( str_replace( $upload['basedir'], '', $target ), '/' );
	$id       = $existing ? (int) $existing[0] : 0;

	if ( $id ) {
		wp_update_post(
			array(
				'ID'             => $id,
				'post_title'     => $title,
				'post_content'   => $description,
				'post_mime_type' => 'image/svg+xml',
			)
		);
		update_post_meta( $id, '_wp_attached_file', $relative );
	} else {
		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/svg+xml',
				'post_title'     => $title,
				'post_content'   => $description,
				'post_status'    => 'inherit',
			),
			$target,
			0,
			true
		);

		if ( is_wp_error( $id ) ) {
			$ail_fail( $id->get_error_message() );
		}

		update_post_meta( $id, '_arts_il_asset', $key );
	}

	wp_update_attachment_metadata(
		$id,
		array(
			'width'  => $width,
			'height' => $height,
			'file'   => $relative,
			'sizes'  => array(
				'full' => array(
					'file'      => $filename,
					'width'     => $width,
					'height'    => $height,
					'mime-type' => 'image/svg+xml',
				),
			),
		)
	);

	return (int) $id;
};


// Swiss poster set: paper #efece5, ink #141414, vermilion #e3311a. Type is
// Helvetica/Arial — an <img>-embedded SVG can only reach installed fonts.

$ail_svg_bars = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<path d="M300 0V1600M1200 0V1600M2100 0V1600M0 400H2400M0 1200H2400" fill="none" stroke="#141414" stroke-opacity="0.2" stroke-width="2"/>
<rect x="300" y="400" width="1500" height="120" fill="#141414"/>
<rect x="300" y="600" width="900" height="120" fill="#141414"/>
<rect x="300" y="800" width="1800" height="120" fill="#141414"/>
<rect x="1800" y="1200" width="300" height="300" fill="#e3311a"/>
<text x="300" y="1450" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">01 — BARS</text>
</svg>
SVG;

$ail_svg_diagonal = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<polygon points="0,1600 0,1180 2400,0 2400,420" fill="#141414"/>
<circle cx="1620" cy="1100" r="300" fill="#e3311a"/>
<path d="M0 1390L2400 210" stroke="#efece5" stroke-width="3"/>
<text x="120" y="200" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">02 — DIAGONAL</text>
</svg>
SVG;

$ail_svg_seven = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<text x="-40" y="1560" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="2300" font-weight="700" fill="#141414" letter-spacing="-0.06em">7</text>
<rect x="1700" width="60" height="1600" fill="#e3311a"/>
<text x="1820" y="1520" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">03 — SEVEN</text>
</svg>
SVG;

$ail_svg_arcs = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<g fill="none" stroke="#141414">
<circle cx="2500" cy="1750" r="480" stroke-width="36"/>
<circle cx="2500" cy="1750" r="640" stroke-width="52"/>
<circle cx="2500" cy="1750" r="840" stroke-width="76"/>
<circle cx="2500" cy="1750" r="1090" stroke-width="110" stroke="#e3311a"/>
<circle cx="2500" cy="1750" r="1400" stroke-width="160"/>
<circle cx="2500" cy="1750" r="1790" stroke-width="230"/>
<circle cx="2500" cy="1750" r="2270" stroke-width="330"/>
</g>
<text x="120" y="200" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">04 — ARCS</text>
</svg>
SVG;

$ail_svg_rhythm = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<g fill="#141414">
<rect x="80" y="1180" width="80" height="300"/><rect x="220" y="780" width="80" height="700"/><rect x="360" y="980" width="80" height="500"/>
<rect x="500" y="380" width="80" height="1100"/><rect x="640" y="580" width="80" height="900"/><rect x="780" y="1080" width="80" height="400"/>
<rect x="920" y="180" width="80" height="1300" fill="#e3311a"/><rect x="1060" y="880" width="80" height="600"/><rect x="1200" y="480" width="80" height="1000"/>
<rect x="1340" y="1130" width="80" height="350"/><rect x="1480" y="680" width="80" height="800"/><rect x="1620" y="280" width="80" height="1200"/>
<rect x="1760" y="1030" width="80" height="450"/><rect x="1900" y="530" width="80" height="950"/><rect x="2040" y="830" width="80" height="650"/><rect x="2180" y="80" width="80" height="1400"/>
</g>
<path d="M80 1480H2260" stroke="#141414" stroke-width="6"/>
<text x="80" y="1560" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">05 — RHYTHM</text>
</svg>
SVG;

$ail_svg_discs = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">
<rect width="2400" height="1600" fill="#efece5"/>
<path d="M0 1600L2400 0" stroke="#141414" stroke-opacity="0.35" stroke-width="3"/>
<circle cx="900" cy="800" r="620" fill="#141414"/>
<circle cx="1900" cy="1150" r="330" fill="none" stroke="#141414" stroke-width="16"/>
<circle cx="1560" cy="560" r="260" fill="#e3311a"/>
<text x="120" y="1520" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#141414">06 — DISCS</text>
</svg>
SVG;

// The explore piece: a programme sheet. A masthead, a cropped numeral, and
// forty rows of small tabular type — the kind of detail that only reads once
// the sheet fills the screen and glides under the mouse. Rows come from a
// fixed-seed LCG so every run prints the same sheet.
$ail_rows = '';
$ail_seed = 20260831;
$ail_next = static function () use ( &$ail_seed ): int {
	$ail_seed = ( $ail_seed * 1103515245 + 12345 ) % 2147483648;
	return $ail_seed;
};
for ( $i = 0; $i < 40; $i++ ) {
	$y         = 760 + $i * 64;
	$time      = sprintf( '%02d.%02d', 8 + intdiv( $i, 3 ), ( $i % 3 ) * 20 );
	$ref       = sprintf( 'A-%04d', 1200 + $ail_next() % 800 );
	$key       = sprintf( '%d.%d', $ail_next() % 90 + 10, $ail_next() % 10 );
	$val       = sprintf( '%d', 100 + $ail_next() % 900 );
	$delta     = sprintf( '%s%d.%02d', ( $ail_next() % 2 ) ? '+' : '-', $ail_next() % 9, $ail_next() % 100 );
	$ail_rows .= sprintf(
		'<text y="%d"><tspan x="120">%02d</tspan><tspan x="360">%s</tspan><tspan x="760">%s</tspan><tspan x="1200">%s</tspan><tspan x="1640">%s</tspan><tspan x="2080">%s</tspan></text>' . "\n",
		$y,
		$i + 1,
		$time,
		$ref,
		$key,
		$val,
		$delta
	);
	$ail_rows .= sprintf(
		'<path d="M120 %dH2280" stroke="#141414" stroke-opacity="%s" stroke-width="%s"/>' . "\n",
		$y + 20,
		( 9 === $i % 10 ) ? '0.8' : '0.2',
		( 9 === $i % 10 ) ? '3' : '1.5'
	);
}

$ail_svg_sheet  = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3600" viewBox="0 0 2400 3600">
<rect width="2400" height="3600" fill="#efece5"/>
<rect x="120" y="120" width="2160" height="360" fill="#e3311a"/>
<g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" fill="#efece5">
<text x="160" y="400" font-size="230" letter-spacing="-0.04em">PROGRAMME</text>
<text x="2240" y="200" font-size="36" text-anchor="end">SHEET 04</text>
<text x="2240" y="250" font-size="36" text-anchor="end">40 ROWS</text>
</g>
<g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#141414">
<text y="690"><tspan x="120">NR</tspan><tspan x="360">TIME</tspan><tspan x="760">REF</tspan><tspan x="1200">KEY</tspan><tspan x="1640">VALUE</tspan><tspan x="2080">DELTA</tspan></text>
</g>
<path d="M120 712H2280" stroke="#141414" stroke-width="4"/>
<g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="30" fill="#141414">
SVG;
$ail_svg_sheet .= $ail_rows;
$ail_svg_sheet .= <<<'SVG'
</g>
<text x="2320" y="3560" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="900" font-weight="700" fill="#141414" letter-spacing="-0.06em" text-anchor="end" fill-opacity="0.92">04</text>
<path d="M120 3400H1300" stroke="#141414" stroke-width="4"/>
<text x="120" y="3470" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="#141414">ARTS IMMERSIVE LIGHTBOX — LIVE PREVIEW</text>
</svg>
SVG;

$slide_ids = array(
	$ail_attach( 'slide-bars', 'ail-bars.svg', $ail_svg_bars, 'Bars', 'Three weights on one grid.', 2400, 1600 ),
	$ail_attach( 'slide-diagonal', 'ail-diagonal.svg', $ail_svg_diagonal, 'Diagonal', 'One band, one disc.', 2400, 1600 ),
	$ail_attach( 'slide-seven', 'ail-seven.svg', $ail_svg_seven, 'Seven', 'A numeral cropped by the frame.', 2400, 1600 ),
	$ail_attach( 'slide-arcs', 'ail-arcs.svg', $ail_svg_arcs, 'Arcs', 'Rings that grow as they leave.', 2400, 1600 ),
	$ail_attach( 'slide-rhythm', 'ail-rhythm.svg', $ail_svg_rhythm, 'Rhythm', 'Sixteen bars, one in red.', 2400, 1600 ),
	$ail_attach( 'slide-discs', 'ail-discs.svg', $ail_svg_discs, 'Discs', 'Two discs and a ring.', 2400, 1600 ),
);

$survey_id = $ail_attach( 'sheet', 'ail-sheet.svg', $ail_svg_sheet, 'Programme 04', 'Forty rows of small type. Move the mouse to read them.', 2400, 3600 );

update_option( 'blogname', 'Immersive Lightbox' );
// Blank, or "Just another WordPress site" renders as a tagline line.
update_option( 'blogdescription', '' );

// --- Kit: thumbnails on ------------------------------------------------------------
// The one behavior default the demo changes. Behavior settings are read
// server-side by Options::build() on every front-end load, so the meta write
// is all it takes — no kit CSS to regenerate.

$kit_id = 0;
if ( class_exists( '\Elementor\Plugin' ) && \Elementor\Plugin::$instance && \Elementor\Plugin::$instance->kits_manager ) {
	$kit_id = (int) \Elementor\Plugin::$instance->kits_manager->get_active_id();
}

if ( $kit_id ) {
	$kit_settings = get_post_meta( $kit_id, '_elementor_page_settings', true );
	$kit_settings = is_array( $kit_settings ) ? $kit_settings : array();

	$kit_settings['arts_lightbox_thumbnails'] = 'yes';

	update_post_meta( $kit_id, '_elementor_page_settings', wp_slash( $kit_settings ) );
}

// --- Page content ---------------------------------------------------------------

$hero = ail_row(
	array(
		'_element_id'    => 'top',
		'flex_direction' => 'column',
		'flex_gap'       => ail_gap( 18 ),
		'padding'        => array(
			'unit'     => 'px',
			'top'      => '120',
			'right'    => '0',
			'bottom'   => '48',
			'left'     => '0',
			'isLinked' => false,
		),
	),
	array(
		// Anchor smoothness, baked into page content because the seed runs once
		// at provisioning — a wp_head hook registered here would not survive
		// past that request.
		array(
			'id'         => ail_seed_id(),
			'elType'     => 'widget',
			'widgetType' => 'html',
			'settings'   => array(
				'html' => '<style>html{scroll-behavior:smooth}</style>',
			),
			'elements'   => array(),
		),
		ail_heading(
			'The image you click is the one that opens.',
			'h1',
			'clamp(32px, 5vw, 44px)',
			array(
				'typography_line_height'    => array(
					'unit' => 'custom',
					'size' => '1.15',
				),
				'typography_letter_spacing' => array(
					'unit'  => 'em',
					'size'  => -0.02,
					'sizes' => array(),
				),
			)
		),
		ail_body(
			'It lifts off the page, and when you close it, it settles back exactly where it came from — however far you have scrolled. Click any image below.',
			array(
				'_element_custom_width' => array(
					'unit' => 'custom',
					'size' => 'min(46ch, 100%)',
				),
			)
		),
	)
);

$gallery_section = ail_section(
	'gallery',
	array(
		ail_heading( 'Six slides, one gallery', 'h2', '22px' ),
		ail_body( 'A stock Elementor Basic Gallery. Pull a slide across with the mouse — it moves with the same physics as a swipe on a phone. The rail along the bottom jumps straight to any slide, and the scroll wheel steps through them.' ),
		ail_gallery( $slide_ids ),
		ail_hint( 'Esc, or a click on the backdrop, sends the image home.' ),
	),
	array(
		'padding' => array(
			'unit'     => 'px',
			'top'      => '48',
			'right'    => '0',
			'bottom'   => '96',
			'left'     => '0',
			'isLinked' => false,
		),
	)
);

$explore_section = ail_section(
	'explore',
	array(
		ail_heading( 'Explore pan', 'h2', '22px' ),
		ail_body( 'Made for photographers. Open the sheet and just move the mouse: it fills the screen and glides under the cursor, the way you would lean closer to a print, and every line of small type stays sharp. Click to see the whole frame; click again to fill it.' ),
		ail_image( $survey_id ),
	)
);

$link_section = ail_section(
	'link',
	array(
		ail_heading( 'Any link opens it', 'h2', '22px' ),
		ail_body( 'Every URL field in Elementor gains an “Open in lightbox” checkbox — buttons, icons, text links, widgets from any addon. Paste a YouTube or Vimeo link and it plays as a video slide. This is a stock Elementor button with the box ticked:' ),
		ail_pill(
			'Play the film',
			array(
				'url'           => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
				'is_external'   => '',
				'nofollow'      => '',
				'arts_lightbox' => 'yes',
			),
			array(
				'_margin' => array(
					'unit'     => 'px',
					'top'      => '8',
					'right'    => '0',
					'bottom'   => '0',
					'left'     => '0',
					'isLinked' => false,
				),
			)
		),
	)
);

$outro_section = ail_section(
	'outro',
	array(
		ail_heading( 'Make it yours', 'h2', '22px' ),
		ail_body( 'Colors, typography and the counter live in Site Settings → Lightbox and preview live in the editor; transitions, zoom, explore pan and the thumbnail rail sit right beside them. The preview logs you in — open the page in Elementor and look around.' ),
		ail_pill(
			'Open in Elementor',
			array(
				'url'         => admin_url( 'post.php?post=' . AIL_DEMO_PAGE_ID . '&action=elementor' ),
				'is_external' => '',
				'nofollow'    => '',
			),
			array(
				'_margin' => array(
					'unit'     => 'px',
					'top'      => '8',
					'right'    => '0',
					'bottom'   => '0',
					'left'     => '0',
					'isLinked' => false,
				),
			)
		),
	),
	array(
		'padding' => array(
			'unit'     => 'px',
			'top'      => '96',
			'right'    => '0',
			'bottom'   => '200',
			'left'     => '0',
			'isLinked' => false,
		),
	)
);

$page_wrapper = array(
	'id'       => ail_seed_id(),
	'elType'   => 'container',
	'isInner'  => false,
	'settings' => array(
		'_title'        => 'Content',
		'content_width' => 'boxed',
		'boxed_width'   => array(
			'unit'  => 'px',
			'size'  => 640,
			'sizes' => array(),
		),
		'flex_gap'      => ail_zero_gap(),
		'padding'       => array(
			'unit'     => 'px',
			'top'      => '0',
			'right'    => '24',
			'bottom'   => '0',
			'left'     => '24',
			'isLinked' => false,
		),
	),
	'elements' => array( $hero, $gallery_section, $explore_section, $link_section, $outro_section ),
);

// --- Persist --------------------------------------------------------------------

$slug     = 'ail-demo';
$existing = get_page_by_path( $slug );

$post_id = $existing ? $existing->ID : wp_insert_post(
	array(
		'import_id'   => AIL_DEMO_PAGE_ID,
		'post_type'   => 'page',
		'post_status' => 'publish',
		'post_title'  => 'Arts Immersive Lightbox — Demo',
		'post_name'   => $slug,
	),
	true
);

if ( is_wp_error( $post_id ) ) {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		WP_CLI::error( $post_id->get_error_message() );
	}
	return;
}

$elements = array( $page_wrapper );

$page_settings = array(
	'template'              => 'elementor_canvas',
	'hide_title'            => 'yes',
	'background_background' => 'classic',
	'background_color'      => '#ffffff',
);

// Mirrors Document::save()'s sequence (elementor/core/base/document.php).
update_post_meta( $post_id, '_elementor_page_settings', wp_slash( $page_settings ) );
update_post_meta( $post_id, '_elementor_data', wp_slash( wp_json_encode( $elements, JSON_UNESCAPED_UNICODE ) ) );
update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
update_post_meta( $post_id, '_elementor_template_type', 'wp-page' );
update_post_meta( $post_id, '_wp_page_template', 'elementor_canvas' );

if ( defined( 'ELEMENTOR_VERSION' ) ) {
	update_post_meta( $post_id, '_elementor_version', ELEMENTOR_VERSION );
}

// Post CSS never diffs (is_update_required() is hard-coded false) — delete to regen.
if ( class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
	\Elementor\Core\Files\CSS\Post::create( $post_id )->delete();
}
delete_post_meta( $post_id, '_elementor_element_cache' );

// The editor prefers newer autosave revisions over raw meta — remove them all.
foreach ( wp_get_post_revisions( $post_id, array( 'fields' => 'ids' ) ) as $revision_id ) {
	wp_delete_post_revision( $revision_id );
}

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::success( sprintf( 'Demo page seeded: post_id=%d %s', $post_id, get_permalink( $post_id ) ) );
}
