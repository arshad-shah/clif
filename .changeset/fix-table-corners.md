---
"clif": patch
---

Fix `table()` corner and junction glyphs.

The renderer reused one separator string for the top, middle, and bottom
borders, joining segments with `┼` everywhere. Visually broken corners. Now
uses the correct box-drawing characters:

- Top: `┌─┬─┐`
- Header divider: `├─┼─┤`
- Bottom: `└─┴─┘`

Regression tests added.
