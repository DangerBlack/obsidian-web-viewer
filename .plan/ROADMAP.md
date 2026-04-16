# Obsidian Viewer Implementation Roadmap

**Project**: Obsidian Web Viewer  
**Goal**: Achieve 90% Obsidian compatibility for markdown rendering and navigation  
**Created**: 2026-04-16  
**Status**: Planning Phase

---

## Executive Summary

This roadmap outlines the implementation of missing Obsidian features in the Obsidian Web Viewer. The project currently supports basic markdown, internal links `[[file]]`, images `![[img]]`, and callouts. 

**Target**: Implement 20 missing features across 4 phases over 4-6 weeks.

**Success Metrics**:
- ✅ All Phase 1 features working (heading links, aliases, tables, task lists)
- ✅ 80%+ Obsidian compatibility score
- ✅ No performance regression (<2s initial load)
- ✅ Mobile-responsive UI maintained

---

## Phase Breakdown

### Phase 1: Critical Core Features (Week 1-2)
**Priority**: 🔴 CRITICAL  
**Impact**: Enables basic vault navigation and content rendering  
**Estimated Effort**: 8-12 hours

| # | Feature | Status | Complexity | Dependencies |
|---|---------|--------|------------|--------------|
| 1.1 | Heading Links `[[file#heading]]` | ⏳ Pending | Medium | None |
| 1.2 | File Aliases (frontmatter) | ⏳ Pending | Medium | None |
| 1.3 | Markdown Tables | ⏳ Pending | Low | None |
| 1.4 | Task Lists `- [ ]` | ⏳ Pending | Low | None |

**Phase 1 Goal**: User can navigate to specific sections, find files by alias, render tables and checkboxes.

---

### Phase 2: Advanced Navigation (Week 2-3)
**Priority**: 🟡 HIGH  
**Impact**: Enables content organization and discovery  
**Estimated Effort**: 12-16 hours

| # | Feature | Status | Complexity | Dependencies |
|---|---------|--------|------------|--------------|
| 2.1 | Tags `#tag` with click navigation | ⏳ Pending | Medium | None |
| 2.2 | Backlinks Panel | ⏳ Pending | High | 1.1, 1.2 |
| 2.3 | Transclusions `![[note]]` | ⏳ Pending | High | 1.1 |
| 2.4 | Block References `[[file#^id]]` | ⏳ Pending | High | 2.3 |

**Phase 2 Goal**: User can organize content with tags, see what links to current file, embed notes.

---

### Phase 3: UX & Performance (Week 3-4)
**Priority**: 🟢 MEDIUM  
**Impact**: Improves usability and speed  
**Estimated Effort**: 10-14 hours

| # | Feature | Status | Complexity | Dependencies |
|---|---------|--------|------------|--------------|
| 3.1 | Full-text Search | ⏳ Pending | High | None |
| 3.2 | Outline/Table of Contents | ⏳ Pending | Low | 1.1 |
| 3.3 | Parallel File Discovery | ⏳ Pending | Medium | None |
| 3.4 | Lazy Loading Optimization | ⏳ Pending | Low | None |

**Phase 3 Goal**: Fast search, clear document structure, optimized loading.

---

### Phase 4: Enhanced Media & Advanced Features (Week 4-6)
**Priority**: 🔵 LOW  
**Impact**: Rich media support and power features  
**Estimated Effort**: 8-12 hours

| # | Feature | Status | Complexity | Dependencies |
|---|---------|--------|------------|--------------|
| 4.1 | PDF Embedding | ⏳ Pending | Medium | None |
| 4.2 | Audio/Video Support | ⏳ Pending | Low | None |
| 4.3 | Math Support (KaTeX) | ⏳ Pending | Medium | None |
| 4.4 | Footnotes | ⏳ Pending | Medium | None |
| 4.5 | Graph View (optional) | ⏳ Pending | High | None |

**Phase 4 Goal**: Full media support, mathematical notation, optional graph visualization.

---

## Detailed Implementation Plans

### Feature 1.1: Heading Links `[[file#heading]]`

**Objective**: Support links to specific headings within files.

**Current Behavior**:
- `[[file#heading]]` treated as literal filename
- No heading anchors generated in HTML

**Target Behavior**:
- `[[player/John#Biography]]` links to `player/John.md` and scrolls to `## Biography`
- Headings get auto-generated IDs: `## Biography` → `id="biography"`
- URL hash updates: `#file#heading`

**Implementation Steps**:

1. **Modify `parseMarkdown()`** (app.js:50-184):
   ```javascript
   // Add after header generation
   html = html.replace(/^## (.+)$/gm, (match, text) => {
       const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
       return `<h2 id="${id}">${text}</h2>`;
   });
   // Repeat for h1, h3, etc.
   ```

2. **Modify `resolvePath()`** (app.js:243-300):
   ```javascript
   // Parse heading anchor
   const [filePart, headingPart] = cleanLink.split('#');
   if (headingPart) {
       // Store heading info for later scrolling
       resolvedPath = fileCache[filePart] || filePart;
       // Will scroll to heading after load
   }
   ```

3. **Modify `loadFile()`** (app.js:360-389):
   ```javascript
   // After loading file
   if (path.includes('#')) {
       const [, heading] = path.split('#');
       setTimeout(() => {
           const element = document.getElementById(heading);
           if (element) element.scrollIntoView();
       }, 100);
   }
   ```

**Test Cases**:
- [ ] `[[file#heading]]` navigates and scrolls
- [ ] Multiple headings in same file work
- [ ] Non-existent heading shows warning
- [ ] URL hash reflects heading

**Files to Change**: `app.js` (3 functions)  
**Estimated Time**: 2-3 hours

---

### Feature 1.2: File Aliases (Frontmatter Parsing)

**Objective**: Allow files to be found by alias names defined in YAML frontmatter.

**Current Behavior**:
- Files only found by filename or basename
- `[[John]]` won't find `player/john-doe.md`

**Target Behavior**:
- Parse YAML frontmatter for `aliases:` array
- Build `aliasCache` mapping aliases to file paths
- `[[John]]` finds file with `aliases: [John, Johnny]`

**Implementation Steps**:

1. **Add frontmatter parser**:
   ```javascript
   function parseFrontmatter(content) {
       const match = content.match(/^---\n([\s\S]*?)\n---/);
       if (!match) return {};
       
       const yaml = match[1];
       const aliases = [];
       
       // Simple YAML parsing for aliases
       const aliasMatch = yaml.match(/aliases:\s*\n((?:\s*-\s*.+\n?)+)/);
       if (aliasMatch) {
           aliasMatch[1].split('\n')
               .filter(line => line.trim().startsWith('-'))
               .forEach(line => {
                   aliases.push(line.replace(/^\s*-\s*/, '').trim());
               });
       }
       
       return { aliases };
   }
   ```

2. **Build alias cache in `loadMarkdownFile()`**:
   ```javascript
   const frontmatter = parseFrontmatter(content);
   if (frontmatter.aliases) {
       frontmatter.aliases.forEach(alias => {
           fileCache[alias] = path;
       });
   }
   ```

3. **Update `resolvePath()`** to check alias cache first

**Test Cases**:
- [ ] File with aliases found by alias name
- [ ] Multiple aliases per file work
- [ ] Case-insensitive matching (optional)
- [ ] Alias conflicts handled gracefully

**Files to Change**: `app.js` (add parser, update 2 functions)  
**Estimated Time**: 2-3 hours

---

### Feature 1.3: Markdown Tables

**Objective**: Render GFM-style tables.

**Current Behavior**:
- Tables render as plain text

**Target Behavior**:
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```
Renders as proper HTML table.

**Implementation Steps**:

1. **Add table parser before paragraph processing**:
   ```javascript
   // Process tables (must be before paragraphs)
   html = html.replace(/^\|(.+)\|\n^\|([\s\-|]+)\|\n((?:^\|.+\|\n?)+)/gm, (match, header, separator, rows) => {
       const headers = header.split('|').map(h => `<th>${h.trim()}</th>`).join('');
       const rowHtml = rows.trim().split('\n')
           .map(row => {
               const cells = row.split('|')
                   .filter((_, i) => i > 0 && i < row.split('|').length - 1)
                   .map(cell => `<td>${cell.trim()}</td>`)
                   .join('');
               return `<tr>${cells}</tr>`;
           })
           .join('');
       
       return `<table><thead><tr>${headers}</tr></thead><tbody>${rowHtml}</tbody></table>`;
   });
   ```

2. **Add table CSS** (index.html styles):
   ```css
   table {
       border-collapse: collapse;
       width: 100%;
       margin: 1rem 0;
   }
   th, td {
       border: 1px solid var(--border-color);
       padding: 0.5rem 1rem;
       text-align: left;
   }
   th {
       background: var(--bg-secondary);
       font-weight: 600;
   }
   ```

**Test Cases**:
- [ ] Simple 2-column table renders
- [ ] Multi-column table renders
- [ ] Table with formatting (bold, links) works
- [ ] Edge cases: empty cells, pipes in cells

**Files to Change**: `app.js` (parseMarkdown), `index.html` (CSS)  
**Estimated Time**: 1-2 hours

---

### Feature 1.4: Task Lists

**Objective**: Render checkboxes for task items.

**Current Behavior**:
- `- [ ] Task` renders as bullet point

**Target Behavior**:
- `- [ ] Task` → unchecked checkbox
- `- [x] Task` → checked checkbox

**Implementation Steps**:

1. **Update list parsing** (app.js:141-156):
   ```javascript
   // Task list items (before regular lists)
   html = html.replace(/^[\-\*] \[([ x])\] (.+)$/gm, (match, checked, text) => {
       const isChecked = checked.toLowerCase() === 'x';
       return `<li class="task-list-item">
           <input type="checkbox" ${isChecked ? 'checked' : ''} disabled>
           <span class="${isChecked ? 'checked' : ''}">${text}</span>
       </li>`;
   });
   ```

2. **Add task list CSS**:
   ```css
   .task-list-item {
       list-style: none;
       display: flex;
       align-items: flex-start;
       gap: 0.5rem;
   }
   .task-list-item input[type="checkbox"] {
       margin-top: 0.25rem;
   }
   .task-list-item .checked {
       text-decoration: line-through;
       color: var(--text-muted);
   }
   ```

**Test Cases**:
- [ ] Unchecked task renders
- [ ] Checked task renders with strikethrough
- [ ] Mixed lists (tasks + regular items) work
- [ ] Nested tasks work

**Files to Change**: `app.js`, `index.html`  
**Estimated Time**: 1 hour

---

### Feature 2.1: Tags `#tag`

**Objective**: Make tags clickable with navigation/filtering.

**Current Behavior**:
- `#tag` renders as plain text

**Target Behavior**:
- `#tag` → clickable link
- Click shows all files with that tag
- Tag panel in sidebar (optional)

**Implementation Steps**:

1. **Tag regex in `parseMarkdown()`**:
   ```javascript
   html = html.replace(/#([a-zA-Z0-9/_-]+)/g, (match, tag) => {
       return `<span class="tag" onclick="filterByTag('${tag}')">#${tag}</span>`;
   });
   ```

2. **Add `filterByTag()` function**:
   ```javascript
   async function filterByTag(tag) {
       // Search all known files for tag
       const matchingFiles = [];
       for (const file of allKnownFiles) {
           const content = await fetchFileAtUrl(file);
           if (content.includes(`#${tag}`)) {
               matchingFiles.push(file);
           }
       }
       // Display results
   }
   ```

3. **Add tag CSS**:
   ```css
   .tag {
       background: var(--accent-color);
       color: var(--text-on-accent);
       padding: 0.2rem 0.5rem;
       border-radius: 0.3rem;
       cursor: pointer;
       font-size: 0.85rem;
   }
   ```

**Test Cases**:
- [ ] Single tag renders as clickable
- [ ] Nested tags `#parent/child` work
- [ ] Click filters files correctly
- [ ] Tag in middle of text detected

**Files to Change**: `app.js` (add function, update parser)  
**Estimated Time**: 2-3 hours

---

### Feature 2.2: Backlinks Panel

**Objective**: Show all files that link to current file.

**Current Behavior**:
- No backlinks view

**Target Behavior**:
- Sidebar panel shows "Linked Mentions"
- Lists all files containing `[[currentFile]]`

**Implementation Steps**:

1. **Build backlink index**:
   ```javascript
   async function buildBacklinkIndex() {
       const index = {};
       for (const file of allKnownFiles) {
           const content = await fetchFileAtUrl(file);
           const links = extractLinks(content, file);
           links.forEach(link => {
               if (!index[link]) index[link] = [];
               index[link].push(file);
           });
       }
       return index;
   }
   ```

2. **Add backlinks UI** (index.html):
   ```html
   <div class="backlinks-panel">
       <h3>Linked Mentions</h3>
       <div id="backlinksList"></div>
   </div>
   ```

3. **Render backlinks on file load**:
   ```javascript
   function renderBacklinks(currentFile) {
       const backlinks = backlinkIndex[currentFile] || [];
       // Display as clickable list
   }
   ```

**Test Cases**:
- [ ] Backlinks show for file with incoming links
- [ ] Empty state for files with no backlinks
- [ ] Clicking backlink navigates
- [ ] Index updates when new files discovered

**Files to Change**: `app.js`, `index.html`  
**Estimated Time**: 3-4 hours

---

### Feature 2.3: Transclusions `![[note]]`

**Objective**: Embed entire notes within notes.

**Current Behavior**:
- `![[note]]` only works for images

**Target Behavior**:
- `![[note]]` embeds note content inline
- `![[note#heading]]` embeds specific section

**Implementation Steps**:

1. **Update image regex** to detect non-images:
   ```javascript
   html = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, async (match, filename, alt) => {
       const isImage = isImageFile(filename);
       if (!isImage) {
           // Load and embed markdown
           const content = await loadFileWithSearch(filename);
           const embeddedHtml = parseMarkdown(content, baseUrl, filename);
           return `<div class="transclusion">${embeddedHtml}</div>`;
       }
       // ... existing image logic
   });
   ```

2. **Add transclusion CSS**:
   ```css
   .transclusion {
       border-left: 3px solid var(--accent-color);
       padding-left: 1rem;
       margin: 1rem 0;
       background: var(--bg-secondary);
   }
   ```

**Test Cases**:
- [ ] Simple transclusion works
- [ ] Transclusion with heading works
- [ ] Nested transclusions handled (prevent infinite loop)
- [ ] Circular references detected

**Files to Change**: `app.js` (major update to image parser)  
**Estimated Time**: 3-4 hours

---

### Feature 2.4: Block References `[[file#^blockid]]`

**Objective**: Link to specific blocks (paragraphs, list items).

**Current Behavior**:
- Not supported

**Target Behavior**:
- Each block gets unique ID
- `[[file#^abc123]]` scrolls to that block

**Implementation Steps**:

1. **Add block ID generation**:
   ```javascript
   // Assign IDs to blocks
   html = html.replace(/^(.+)$/gm, (match, line) => {
       const blockId = generateBlockId(line);
       return `<div data-block-id="${blockId}">${match}</div>`;
   });
   ```

2. **Parse block references** in `resolvePath()`

3. **Scroll to block** on load

**Test Cases**:
- [ ] Block IDs generated
- [ ] Block reference navigates correctly
- [ ] Non-existent block shows warning

**Files to Change**: `app.js`  
**Estimated Time**: 3-4 hours

---

### Feature 3.1: Full-text Search

**Objective**: Search across all file contents.

**Current Behavior**:
- Only filename filtering

**Target Behavior**:
- Modal with search input
- Results ranked by relevance
- Highlight matches

**Implementation Steps**:

1. **Build search index**:
   ```javascript
   const searchIndex = {};
   allKnownFiles.forEach(file => {
       const content = await fetchFileAtUrl(file);
       searchIndex[file] = {
           content: content.toLowerCase(),
           title: file.split('/').pop()
       };
   });
   ```

2. **Search function**:
   ```javascript
   function search(query) {
       const results = [];
       const q = query.toLowerCase();
       for (const [file, data] of Object.entries(searchIndex)) {
           if (data.content.includes(q)) {
               results.push({ file, score: calculateScore(data, q) });
           }
       }
       return results;
   }
   ```

3. **Search UI** (modal)

**Test Cases**:
- [ ] Search returns relevant results
- [ ] Results ranked by relevance
- [ ] Search highlights work
- [ ] Performance acceptable (<500ms)

**Files to Change**: `app.js`, `index.html`  
**Estimated Time**: 4-5 hours

---

### Feature 3.2: Outline/Table of Contents

**Objective**: Show document structure in sidebar.

**Current Behavior**:
- No outline view

**Target Behavior**:
- Sidebar panel shows headings
- Click scrolls to section

**Implementation Steps**:

1. **Extract headings** after parsing:
   ```javascript
   function extractHeadings(html) {
       const headings = [];
       const regex = /<h([1-6])[^>]*>(.+?)<\/h\1>/g;
       let match;
       while ((match = regex.exec(html)) !== null) {
           headings.push({ level: match[1], text: match[2], id: extractId(match[0]) });
       }
       return headings;
   }
   ```

2. **Render outline** in sidebar

**Test Cases**:
- [ ] All headings extracted
- [ ] Proper nesting by level
- [ ] Click scrolls to section

**Files to Change**: `app.js`, `index.html`  
**Estimated Time**: 2 hours

---

### Feature 3.3: Parallel File Discovery

**Objective**: Speed up file discovery.

**Current Behavior**:
- Sequential fetching in `discoverReferencedFiles()`

**Target Behavior**:
- Batch parallel fetching (10 at a time)

**Implementation Steps**:

1. **Update discovery function**:
   ```javascript
   async function discoverReferencedFiles(content, currentFile) {
       const refs = extractAllRefs(content);
       const batches = chunk(refs, 10);
       
       for (const batch of batches) {
           await Promise.all(batch.map(ref => discoverSingle(ref)));
       }
   }
   ```

**Test Cases**:
- [ ] All files discovered
- [ ] 5x faster than sequential
- [ ] No race conditions

**Files to Change**: `app.js`  
**Estimated Time**: 2 hours

---

### Feature 4.1-4.5: Phase 4 Features

Details TBD after Phase 1-3 completion.

---

## Testing Strategy

### Manual Testing Checklist
- [ ] All features work in Chrome, Firefox, Safari
- [ ] Mobile responsive maintained
- [ ] Performance acceptable

### Automated Testing (Future)
- Unit tests for parsers
- Integration tests for navigation
- E2E tests for user flows

---

## Deployment Plan

1. **Development**: Feature branches from `main`
2. **Testing**: Deploy to GitHub Pages staging
3. **Release**: Merge to `main`, tag release

---

## Success Criteria

**Phase 1 Complete When**:
- [ ] All 4 features implemented
- [ ] Manual testing passed
- [ ] No regressions in existing features
- [ ] Performance within 10% of baseline

**Overall Project Complete When**:
- [ ] Phase 1-3 features implemented
- [ ] 80%+ Obsidian compatibility
- [ ] User acceptance testing passed

---

## Appendix: Obsidian Compatibility Matrix

| Feature | Status | Obsidian Parity |
|---------|--------|-----------------|
| Internal links `[[file]]` | ✅ Done | 100% |
| Images `![[img]]` | ✅ Done | 100% |
| Callouts | ✅ Done | 80% |
| Heading links | ⏳ Phase 1 | 0% → 100% |
| Aliases | ⏳ Phase 1 | 0% → 100% |
| Tables | ⏳ Phase 1 | 0% → 100% |
| Task lists | ⏳ Phase 1 | 0% → 100% |
| Tags | ⏳ Phase 2 | 0% → 80% |
| Backlinks | ⏳ Phase 2 | 0% → 90% |
| Transclusions | ⏳ Phase 2 | 0% → 70% |
| Block refs | ⏳ Phase 2 | 0% → 90% |
| Search | ⏳ Phase 3 | 0% → 60% |
| Outline | ⏳ Phase 3 | 0% → 100% |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-16 | 1.0 | Initial roadmap |

---

## Next Actions

1. [ ] Create GitHub issues for Phase 1 features
2. [ ] Set up GitHub milestones
3. [ ] Start implementation: Feature 1.1 (Heading Links)
