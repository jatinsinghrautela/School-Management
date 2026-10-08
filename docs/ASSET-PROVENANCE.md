# Asset provenance and branding

## Schoolglass Desk visual identity

- Schoolglass Desk is a working name coined for this project. It replaces the displayed Orbit brand; existing demo login addresses, passwords and storage keys remain compatible.
- `apps/web/public/brand.svg` and `apps/web/src/glyphs.jsx` contain original AI-generated SVG geometry authored directly for this project. They do not embed icon-pack files, stock imagery or other brands’ artwork.
- Backgrounds, glass treatments, decorative rings and animations are original CSS. No downloaded photos, raster textures or remote image services are used.
- Typography uses locally available system fonts. Google Fonts requests and the Lucide dependency were removed. Application dependencies retain their respective open-source licenses; AI-generated branding does not replace these licenses.
- Demo learning copy is authored for this project. Schools remain responsible for rights to their own uploaded documents and linked materials.
- A web search for the full proposed name returned no results on 2026-10-08. This is not worldwide trademark or copyright clearance, and originality cannot guarantee the absence of independent similar designs or names.

## Performance choices

Blur is limited to navigation surfaces at 8px, and disabled on mobile. Cards use translucent gradients without individual blur filters. Motion uses short opacity/transform transitions and the small existing decorative float, with reduced-motion overrides. No animation framework, animation loop or image download was added. Low-end device performance has not been benchmarked; build size and responsive browser checks are recorded in WORKLOG.

## Updated working identity

Schoolglass Desk is the current English title, replacing the earlier coined name after user feedback. The title is editable in `apps/web/src/brand.js`; the mark is original window geometry. No trademark clearance is claimed. Transparent cards now use gradients with approximately 15–40% white opacity, rather than the earlier near-opaque treatment. Dropdown popovers use a bounded blur only while open in supporting desktop browsers; the mobile fallback disables it.

## Readability correction

After user feedback, content cards were returned to predominantly opaque light surfaces and secondary text was darkened. Decorative glass remains in navigation/backgrounds. All dialogs and picker menus use opaque readable surfaces; the full-page dialog overlay dims without blur. Motion is restricted to small decorative transforms and opacity changes, with reduced-motion overrides. These choices replace the earlier low-opacity content-card treatment.

## Public-holiday references

Holiday data is factual external reference data, not AI-generated artwork. date-holidays uses ISC-licensed code and CC BY-SA 3.0 data; attribution/license links and selected-country source links appear in the workbook Settings and interface. See CALENDAR-EXCEL.md for the India 2026 government source and coverage limits. Original branding and artwork remain project-generated.
