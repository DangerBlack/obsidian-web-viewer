# Main Note with Transclusions

This is the main note that embeds other notes.

## Embedded Note

Here's an embedded note:

![[transcluded-note]]

## Embedded Note with Heading

Here's a specific section from another note:

![[transcluded-note#specific-section]]

## Multiple Transclusions

Another embedded note:

![[test-heading-links]]

---

**Expected behavior**: 
- The full content of `transcluded-note.md` should appear inline
- Only the "Specific Section" heading and its content should appear from `transcluded-note.md`
- The `test-heading-links.md` should be fully embedded
- Circular references should be detected and show an error message
