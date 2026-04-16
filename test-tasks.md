# Task List Test

This file tests task list rendering.

## Simple Task List

- [ ] Task 1: Buy groceries
- [ ] Task 2: Write documentation
- [x] Task 3: Complete project
- [x] Task 4: Deploy to production

## Mixed List

- [ ] Pending task
- Regular bullet point
- [x] Completed task
- Another regular point

## Nested Tasks

- [ ] Parent task 1
  - [ ] Child task 1.1
  - [x] Child task 1.2
- [ ] Parent task 2
  - [ ] Child task 2.1

## Task List with Formatting

- [ ] **Bold** task description
- [x] *Italic* completed task
- [ ] Task with `inline code`
- [x] Task with [link](https://example.com)

## Using Asterisks

* [ ] Asterisk task 1
* [x] Asterisk task 2
* [ ] Asterisk task 3

---

Tasks should render with:
- ✅ Checkboxes (disabled, read-only)
- ✅ Strikethrough for completed tasks
- ✅ Muted color for completed tasks
- ✅ Proper spacing and alignment
