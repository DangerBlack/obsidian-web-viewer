# Heading Links Test

This file tests heading link navigation.

## Introduction

This is the introduction section. You can link to it with `[[heading-links-test#Introduction]]`.

## Features

### Subsection 1

This is a subsection. Link to it with `[[heading-links-test#Subsection 1]]`.

### Subsection 2

Another subsection with **bold** and *italic* text.

## Testing Links

Here are some test links:

- Link to Introduction: [[heading-links-test#Introduction]]
- Link to Subsection 1: [[heading-links-test#Subsection 1]]
- Link to Subsection 2: [[heading-links-test#Subsection 2]]
- Link to another file: [[test-tables]]
- Link with display text: [[heading-links-test#Features|Go to Features]]

## Multi-Word Headings

### This Is A Very Long Heading With Multiple Words

Can you link to this long heading? Yes! Use: `[[heading-links-test#this-is-a-very-long-heading-with-multiple-words]]`

### Special Characters & Symbols!

What about headings with special chars? The ID generator converts them to dashes.

## Code in Headings

### Using `code` in headings

Does code in headings work? Let's test it!

---

## How to Test

1. Click on the links above
2. Page should scroll to the correct heading
3. Heading should highlight briefly (blue fade)
4. URL should update with the anchor

## Edge Cases to Test

- [[heading-links-test#non-existent-heading]] - Should show warning in console
- [[heading-links-test#introduction]] - Case sensitivity test (should work)
- [[heading-links-test#multi-word-headings]] - Link to section header itself
