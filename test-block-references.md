# Block References Test

This page tests block reference functionality.

## Paragraph Blocks

This is the first paragraph. It has a unique block ID that can be referenced.

This is the second paragraph. You can link to it using `[[test-block-references#^blockid]]`.

## List Item Blocks

- First item with a block ID
- Second item that can be referenced
- Third item for testing

## Task List Blocks

- [ ] Unfinished task with block ID
- [x] Completed task that can be linked

## How to Use

1. Find a block ID by inspecting the HTML (look for `data-block-id` attribute)
2. Link to it using `[[test-block-references#^blockid]]`
3. Click the link to scroll to that specific block

## Example Links

- [[test-block-references#^blockid]] - Link to a specific paragraph
- [[test-block-references#list-item-blocks]] - Link to the list section

---

**Expected behavior**: Clicking a block reference link should scroll smoothly to that specific paragraph or list item and highlight it with a blue background.
