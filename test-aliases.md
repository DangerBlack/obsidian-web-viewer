# Alias Test Page

This page tests the file aliases feature.

## Test 1: Link by Alias

Try linking to John Doe using different aliases:

- Link with "John": [[John]]
- Link with "Johnny": [[Johnny]]
- Link with "John Doe": [[John Doe]]
- Link with "JD": [[JD]]

All four links should navigate to the same file: `player/john-doe.md`

## Test 2: Case Insensitivity

- Lowercase "john": [[john]]
- Uppercase "JOHN": [[JOHN]]
- Mixed case "JoHn": [[JoHn]]

All should work due to case-insensitive matching.

## Test 3: Jane Smith (List Format)

- [[Jane Smith]] - Full name
- [[Jane]] - First name only
- [[The Wizard]] - Title
- [[Mage Supreme]] - Another title

## Test 4: Regular Links Still Work

- [[player/john-doe]] - Direct path should still work
- [[player/jane-smith]] - Direct path to Jane

## Test 5: Non-Existent Alias

- [[NonExistentAlias]] - Should show "File not found" error

---

## Expected Behavior

1. All alias links should resolve to the correct files
2. Case-insensitive matching should work
3. Both inline array and list format aliases should work
4. Regular file links should continue working
5. Non-existent aliases should show appropriate error

## How to Test

1. Click each alias link above
2. Verify it navigates to the correct file
3. Check browser console for "Loaded X aliases for path" messages
4. Verify the file cache includes the aliases
