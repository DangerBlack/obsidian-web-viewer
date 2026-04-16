# Test Tags

This page tests the #tag functionality.

## Basic Tags

Here are some tags in different contexts:

- This is a simple #test tag
- Multiple tags: #project-alpha #important #todo
- Nested tags: #parent/child #project-beta/feature

## Tags in Different Elements

### In a paragraph
This paragraph has a #inline-tag in the middle of text.

### In a list
- Item with #tag1
- Another item with #tag2
- Completed task - [x] #completed
- Pending task - [ ] #pending

## Callout with Tags

> [!INFO]
> This callout has #info and #documentation tags

## Expected Behavior

1. All tags above should be **clickable** (blue background)
2. Clicking a tag shows all files containing that tag
3. Results display in a table view
4. "Clear Filter" button returns to normal view

## Test Cases

- [ ] Tags render with proper styling
- [ ] Clicking #test shows this file
- [ ] Clicking #project-alpha shows this file
- [ ] Nested tags like #parent/child work
- [ ] Tag in middle of text is detected
- [ ] Clear Filter button works
