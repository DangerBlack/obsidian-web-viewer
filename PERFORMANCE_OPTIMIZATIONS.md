# Performance Optimizations - Initial Page Load

## Problem Analysis (HAR File)

**Original Issues:**
- **Total load time**: ~15.6 seconds
- **CORS preflight overhead**: 159 OPTIONS requests = 5.1 seconds (32.7%)
- **Failed requests**: 47% (151/318 requests return 403/404)
- **Sequential pattern**: 81ms average gap between requests
- **Exhaustive search**: `loadFileWithSearch()` tries 5-13 variations per file

## Optimizations Implemented

### 1. Request Caching (`fetchCache`)
**Location**: Line 10, 38-59

```javascript
let fetchCache = new Map(); // Cache fetch results

async function fetchMarkdown(url, secret) {
    const cacheKey = `${url}|${secret}`;
    if (fetchCache.has(cacheKey)) {
        return fetchCache.get(cacheKey);
    }
    // ... fetch and cache
}
```

**Impact**: Eliminates duplicate requests for the same URL

---

### 2. Path Resolution Caching (`pathResolutionCache`)
**Location**: Line 11, 335-419, 1030-1036

```javascript
let pathResolutionCache = {}; // Cache successful path resolutions

function resolvePath(link, currentFile) {
    const cacheKey = `${filePart}|${currentFile || ''}`;
    if (pathResolutionCache[cacheKey]) {
        return pathResolutionCache[cacheKey];
    }
    // ... resolve and cache result
}

// Persisted to sessionStorage for page navigation
function saveFileCache() {
    sessionStorage.setItem('pathResolutionCache', JSON.stringify(pathResolutionCache));
}
```

**Impact**: Avoids re-searching for the same file reference across page navigations

---

### 3. Smart Path Ordering
**Location**: Lines 660-750

**Before**: Tried all extensions in all directories (5-13 attempts per file)

**After**: Prioritized search order:
1. **Priority 1**: Exact path if file already has extension
2. **Priority 2**: Same directory as current file (most likely)
3. **Priority 3**: Known directories from fileCache
4. **Priority 4**: Root directory
5. **Priority 5**: Full path with extensions

**Key improvement**: If file has `.png` extension, tries only that (1 request vs 8)

---

### 4. Parallel Batching
**Location**: Lines 520-580

```javascript
const BATCH_SIZE = 10;

for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
    const batch = allRefs.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (ref) => {
        // ... resolve each reference
    });
    await Promise.all(batchPromises);
}
```

**Impact**: Processes 10 files simultaneously instead of sequentially
**Expected improvement**: 10x faster file discovery

---

### 5. Early Cache Check in Discovery
**Location**: Lines 546-548

```javascript
async function discoverReferencedFiles(content, currentFile) {
    // ...
    const batchPromises = batch.map(async (ref) => {
        const name = cleanRef.split('/').pop();
        const baseName = name.replace(/\.[^.]+$/, '');
        
        // Skip if already cached - CRITICAL FIX
        if (fileCache[name] || fileCache[baseName]) {
            return; // Skip discovery entirely
        }
        // ... only search if not cached
    });
}
```

**Impact**: When navigating to a page, skips file discovery for already-known files

**Why this matters**: Before this fix, every page load would re-run the exhaustive path search for ALL referenced files, even if they were already cached. Now it only discovers NEW files.

---

## Expected Performance Gains

| Metric | Before | After (Expected) | Improvement |
|--------|--------|------------------|-------------|
| Total load time | ~15.6s | <3s | 80%+ faster |
| OPTIONS overhead | 5.1s (32.7%) | <1s | 80%+ reduction |
| Failed requests | 47% | <10% | 80%+ reduction |
| Request pattern | Sequential | Batched (10) | 10x throughput |

---

## Testing Instructions

1. **Generate new HAR file**:
   - Open Chrome DevTools → Network tab
   - Load the page with your vault
   - Export HAR file

2. **Compare metrics**:
   - Total load time
   - Number of requests
   - Failed requests (403/404)
   - OPTIONS request count

3. **Verify functionality**:
   - All internal links work
   - Images load correctly
   - No regressions in Phase 1 features (tables, tasks, heading links, aliases)

---

## Files Modified

- `app.js` - All performance optimizations

## Next Steps

1. Test with production vault
2. Measure actual performance improvement
3. If needed, fine-tune BATCH_SIZE (currently 10)
4. Consider server-side optimizations (CORS preflight caching)
