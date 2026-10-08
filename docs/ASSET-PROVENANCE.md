# Asset provenance and branding

## NuvyraSchola visual identity

- NuvyraSchola is a working name coined for this project. It replaces the displayed Orbit brand; existing demo login addresses, passwords and storage keys remain compatible.
- `apps/web/public/brand.svg` and `apps/web/src/glyphs.jsx` contain original AI-generated SVG geometry authored directly for this project. They do not embed icon-pack files, stock imagery or other brands’ artwork.
- Backgrounds, glass treatments, decorative rings and animations are original CSS. No downloaded photos, raster textures or remote image services are used.
- Typography uses locally available system fonts. Google Fonts requests and the Lucide dependency were removed. Application dependencies retain their respective open-source licenses; AI-generated branding does not replace these licenses.
- Demo learning copy is authored for this project. Schools remain responsible for rights to their own uploaded documents and linked materials.
- A web search for the full proposed name returned no results on 2026-10-08. This is not worldwide trademark or copyright clearance, and originality cannot guarantee the absence of independent similar designs or names.

## Performance choices

Blur is limited to navigation surfaces at 8px, and disabled on mobile. Cards use translucent gradients without individual blur filters. Motion uses short opacity/transform transitions and the small existing decorative float, with reduced-motion overrides. No animation framework, animation loop or image download was added. Low-end device performance has not been benchmarked; build size and responsive browser checks are recorded in WORKLOG.
