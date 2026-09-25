# Self-hosted fonts

Newsreader (display serif), IBM Plex Sans (body), IBM Plex Mono (data, labels,
paths, hashes, peptide sequences). Latin subsets only.

These are served from this origin on purpose. Linking Google Fonts makes the
browser call `fonts.googleapis.com` and `fonts.gstatic.com` on every page load,
which breaks the guarantee `scripts/verify-workspace.mjs` asserts: the browser
talks only to this origin. For a workspace that may hold confidential programme
data, announcing every page load to a third party is a worse trade than the
convenience of a CDN link.

All three families are licensed under the SIL Open Font License 1.1, which
permits redistribution. Keep this note with the files.

To regenerate after changing weights, fetch the Google CSS with a browser
user-agent, keep the `latin` and `latin-ext` blocks, download each `.woff2`
under `public/fonts/`, and rewrite each `url()` to `/fonts/<file>`. Verify no
`fonts.gstatic.com` reference survives in `fonts.css`, then run
`node scripts/verify-workspace.mjs`, which fails on any cross-origin request.
