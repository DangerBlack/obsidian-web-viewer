        // State
        let currentPath = '';
        let baseUrl = '';
        let secretKey = '';
        let visitedFiles = new Set();
        let hasInitialized = false;
        let fileCache = {}; // Maps filename -> full path
        let allKnownFiles = []; // All files from config + discovered

        // Parse URL fragment
        function parseFragment() {
            const fragment = window.location.hash.slice(1);
            if (!fragment) {
                showError('No URL fragment provided. Use #base64_encoded_json');
                return null;
            }

            try {
                const decoded = atob(fragment);
                const config = JSON.parse(decoded);
                
                if (!config.url || !config.secret) {
                    showError('Invalid fragment format. Expected {url, secret, file}');
                    return null;
                }

                return config;
            } catch (e) {
                showError('Failed to decode URL fragment: ' + e.message);
                return null;
            }
        }

        // Fetch markdown file content
        async function fetchMarkdown(url, secret) {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-secret-key': secret
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        }

        // Parse markdown to HTML
        function parseMarkdown(md, baseUrl, currentFile) {
            let html = md;

            // First: Process bare URLs (before any HTML generation)
            html = html.replace(/\b(https?:\/\/[^\s<>"')\]]+)(?=[\s<>"')\]]|$)/g, '___URL:$1___');

            // Code blocks
            html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`;
            });

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Images - handle all Obsidian formats
            // 1. ![[filename]] or ![[filename|alt]] or ![[filename|dimensions]]
            html = html.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, filename, altOrDims) => {
                // Check if this looks like an image (common image extensions)
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
                const lowerFilename = filename.toLowerCase();
                const isImage = imageExtensions.some(ext => lowerFilename.endsWith(ext));
                
                if (isImage) {
                    const imagePath = resolvePath(filename, currentFile);
                    const encodedPath = imagePath.split('/').map(encodeURIComponent).join('/');
                    const fullImageUrl = `${baseUrl}/${encodedPath}`;
                    const alt = altOrDims || filename;
                    // Use data attribute for the real URL, load via JavaScript
                    return `<div class="image-container"><img src="about:blank" data-src="${fullImageUrl}" data-secret="${secretKey}" alt="${alt}" class="image-preview lazy-image" /></div>`;
                }
                // Not an image, leave as internal link (will be handled by internal link regex)
                return match;
            });

            // 2. ![alt](url) - Standard markdown images
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
                if (url.startsWith('http')) {
                    return `<div class="image-container"><img src="${url}" alt="${alt}" class="image-preview" /></div>`;
                } else {
                    // Relative image path
                    const imagePath = resolvePath(url, currentFile);
                    const encodedPath = imagePath.split('/').map(encodeURIComponent).join('/');
                    const fullImageUrl = `${baseUrl}/${encodedPath}`;
                    // Use data attribute for authenticated images
                    return `<div class="image-container"><img src="about:blank" data-src="${fullImageUrl}" data-secret="${secretKey}" alt="${alt}" class="image-preview lazy-image" /></div>`;
                }
            });

            // Internal links [[file]] or [[file|display]]
            html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, file, display) => {
                const displayName = display || file;
                // Escape single quotes for JavaScript
                const escapedFile = file.replace(/'/g, "\\'");
                // Don't resolve path here - let loadFile handle the search
                return `<span class="internal-link" onclick="loadFile('${escapedFile}')">${displayName}</span>`;
            });

            // External links [text](url)
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

            // Restore and convert bare URLs to links
            html = html.replace(/___URL:(https?:\/\/[^\s<>"')\]]+)___/g, '<a href="$1" target="_blank">$1</a>');

            // Headers
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // Blockquotes
            html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

            // Callouts
            html = html.replace(/> \[!(\w+)\]\n> (.+?)(?=\n\n|$)/gs, (match, type, content) => {
                const typeLower = type.toLowerCase();
                let calloutClass = 'callout-info';
                let title = 'Note';

                switch (typeLower) {
                    case 'note': calloutClass = 'callout-note'; title = 'Note'; break;
                    case 'info': calloutClass = 'callout-info'; title = 'Info'; break;
                    case 'warning': calloutClass = 'callout-warning'; title = 'Warning'; break;
                    case 'error': calloutClass = 'callout-error'; title = 'Error'; break;
                }

                return `<div class="callout ${calloutClass}">
                    <div class="callout-title">${title}</div>
                    <div>${parseInline(content)}</div>
                </div>`;
            });

            // Bold and italic
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // Lists
            html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
            html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

            // Wrap consecutive li elements in ul/ol
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

            // Horizontal rule
            html = html.replace(/^---$/gm, '<hr />');

            // Paragraphs
            html = html.split('\n\n').map(block => {
                block = block.trim();
                if (!block) return '';
                if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<ul') || block.startsWith('<blockquote') || block.startsWith('<div') || block.startsWith('<hr')) {
                    return block;
                }
                return `<p>${block.replace(/\n/g, '<br>')}</p>`;
            }).join('\n');

            return html;
        }

        function parseInline(text) {
            text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            return text;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Extract links from markdown content
        function extractLinks(markdown, currentFile) {
            const links = [];
            
            // Internal links [[file]] or [[file|display]]
            const internalRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
            let match;
            while ((match = internalRegex.exec(markdown)) !== null) {
                const linkFile = match[1];
                const resolvedPath = resolvePath(linkFile, currentFile);
                if (!links.includes(resolvedPath)) {
                    links.push(resolvedPath);
                }
            }
            
            return links;
        }

        // Resolve relative path
        function resolvePath(link, currentFile) {
            if (link.startsWith('http://') || link.startsWith('https://')) {
                return link;
            }
            
            // Handle absolute paths starting with /
            if (link.startsWith('/')) {
                return link.substring(1); // Remove leading slash
            }
            
            // Check if the link is in our file cache (absolute path from vault root)
            if (fileCache[link] || fileCache[link + '.md'] || fileCache[link + '.png'] || fileCache[link + '.jpg']) {
                // Use the cached absolute path
                const cachedPath = fileCache[link] || fileCache[link + '.md'] || fileCache[link + '.png'] || fileCache[link + '.jpg'];
                return cachedPath;
            }
            
            // Get the directory of the current file
            const lastSlash = currentFile.lastIndexOf('/');
            const currentDir = lastSlash > 0 ? currentFile.substring(0, lastSlash) : '';
            
            // Handle relative paths with ../
            if (link.startsWith('../')) {
                // Go up directories
                const parts = currentDir.split('/');
                const linkParts = link.split('/');
                while (linkParts[0] === '..') {
                    parts.pop();
                    linkParts.shift();
                }
                const resolvedPath = parts.concat(linkParts).join('/');
                return resolvedPath || linkParts.join('/');
            }
            
            // Handle relative paths with ./
            if (link.startsWith('./')) {
                return currentDir ? `${currentDir}/${link.substring(2)}` : link.substring(2);
            }
            
            // For simple filenames without path, try current directory first, then root
            if (currentDir) {
                return currentDir + '/' + link;
            }
            return link;
        }

        // Render file explorer (all known files)
        function renderFileExplorer() {
            const list = document.getElementById('fileList');
            
            // Combine all known files with visited files
            const allFiles = new Set(allKnownFiles);
            visitedFiles.forEach(f => allFiles.add(f));
            
            // Sort files
            const sortedFiles = Array.from(allFiles).sort();
            
            // Group by base filename to avoid duplicates, keeping full path
            const uniqueFiles = {};
            sortedFiles.forEach(file => {
                const baseName = file.split('/').pop();
                // Keep the full path version if available
                if (!uniqueFiles[baseName] || file.includes('/')) {
                    uniqueFiles[baseName] = file;
                }
            });
            
            const finalList = Object.values(uniqueFiles).sort();
            
            list.innerHTML = finalList.map(file => {
                const escapedFile = file.replace(/'/g, "\\'");
                return `<li class="file-item ${file === currentPath ? 'active' : ''}" onclick="loadFile('${escapedFile}')">
                    <span class="icon">📄</span>
                    <span class="name">${file.split('/').pop().replace('.md', '')}</span>
                </li>`;
            }).join('');
        }

        // Render breadcrumbs
        function renderBreadcrumbs(path) {
            const parts = path.split('/').filter(Boolean);
            const crumbs = [];

            let current = '';
            parts.forEach((part, i) => {
                current += '/' + part;
                const isLast = i === parts.length - 1;
                const escapedCurrent = current.replace(/'/g, "\\'");
                if (isLast) {
                    crumbs.push(`<span class="breadcrumb-current">${part.replace('.md', '')}</span>`);
                } else {
                    crumbs.push(`<a class="breadcrumb-item" onclick="loadFile('${escapedCurrent}')">${part}</a>`);
                }
                if (!isLast) {
                    crumbs.push('/');
                }
            });

            document.getElementById('breadcrumbs').innerHTML = crumbs.join('');
        }

        // Load file content
        async function loadFile(path) {
            currentPath = path;
            
            const container = document.getElementById('contentContainer');
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

            try {
                // Check if this is an image file
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
                const lowerPath = path.toLowerCase();
                const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
                
                if (isImage) {
                    // Load and display image directly
                    await loadImageFile(path);
                } else {
                    // Load markdown file
                    await loadMarkdownFile(path);
                }
                
                // Track visited file
                visitedFiles.add(path);
                
                renderFileExplorer();
                renderBreadcrumbs(path);
            } catch (e) {
                container.innerHTML = `<div class="error">Failed to load file: ${e.message}</div>`;
            }
        }

        // Load markdown file
        async function loadMarkdownFile(path) {
            // Use search to find the file
            const content = await loadFileWithSearch(path);
            
            // Extract links for navigation
            const links = extractLinks(content, path);
            links.forEach(link => visitedFiles.add(link));
            
            const html = parseMarkdown(content, baseUrl, path);

            const fileName = path.split('/').pop().replace('.md', '');
            const container = document.getElementById('contentContainer');
            container.innerHTML = `
                <div class="content-view">
                    <h1>${fileName}</h1>
                    ${html}
                </div>
            `;
            
            // Load lazy images after content is rendered
            setTimeout(loadLazyImages, 100);
        }

        // Load image file
        async function loadImageFile(path) {
            const encodedPath = path.split('/').map(encodeURIComponent).join('/');
            const fullUrl = `${baseUrl}/${encodedPath}`;
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'x-secret-key': secretKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const fileName = path.split('/').pop();
            const container = document.getElementById('contentContainer');
            container.innerHTML = `
                <div class="content-view">
                    <h1>${fileName}</h1>
                    <div class="image-container">
                        <img src="${blobUrl}" alt="${fileName}" class="image-preview" style="max-width: 100%; height: auto;" />
                    </div>
                </div>
            `;
        }

        // Try to load file from multiple possible locations
        async function loadFileWithSearch(filename) {
            const baseName = filename.split('/').pop();
            
            // 1. Check cache first
            if (fileCache[baseName]) {
                console.log(`Found in cache: ${baseName} -> ${fileCache[baseName]}`);
                return await fetchFileAtUrl(fileCache[baseName]);
            }
            
            // 2. Build search paths
            const searchPaths = [];
            
            // If filename has path, try it as-is first
            if (filename.includes('/')) {
                searchPaths.push(filename);
            }
            
            // Try all known directories from file cache
            const knownDirs = new Set();
            Object.values(fileCache).forEach(path => {
                const lastSlash = path.lastIndexOf('/');
                if (lastSlash > 0) {
                    knownDirs.add(path.substring(0, lastSlash));
                }
            });
            
            // Add all known directories to search
            knownDirs.forEach(dir => {
                searchPaths.push(`${dir}/${baseName}`);
            });
            
            // Try current file's directory
            if (currentPath && currentPath.includes('/')) {
                const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                if (!knownDirs.has(currentDir)) {
                    searchPaths.push(`${currentDir}/${baseName}`);
                }
            }
            
            // Try root
            searchPaths.push(baseName);
            
            // 3. Try with .md extension if not present
            if (!filename.endsWith('.md') && !filename.endsWith('.base')) {
                const mdName = baseName + '.md';
                // Add .md versions of known dirs paths first
                const newSearchPaths = [];
                knownDirs.forEach(dir => {
                    newSearchPaths.unshift(`${dir}/${mdName}`);
                });
                if (currentPath && currentPath.includes('/')) {
                    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                    newSearchPaths.unshift(`${currentDir}/${mdName}`);
                }
                newSearchPaths.unshift(mdName);
                
                // Try these first
                for (const path of newSearchPaths) {
                    try {
                        const content = await fetchFileAtUrl(path);
                        fileCache[baseName] = path;
                        fileCache[mdName] = path;
                        saveFileCache();
                        console.log(`Cached: ${baseName} -> ${path}`);
                        return content;
                    } catch (e) {
                        console.log(`Not found: ${path}`);
                    }
                }
            }
            
            // 4. Try all other search paths
            for (const path of searchPaths) {
                try {
                    const content = await fetchFileAtUrl(path);
                    fileCache[baseName] = path;
                    fileCache[mdName] = path;
                    saveFileCache();
                    console.log(`Cached: ${baseName} -> ${path}`);
                    return content;
                } catch (e) {
                    console.log(`Not found: ${path}`);
                }
            }
            
            throw new Error(`File not found: ${filename}`);
        }

        // Fetch file at specific URL path
        async function fetchFileAtUrl(path) {
            const encodedPath = path.split('/').map(encodeURIComponent).join('/');
            const fullUrl = `${baseUrl}/${encodedPath}`;
            const content = await fetchMarkdown(fullUrl, secretKey);
            return content;
        }

        // Render table view (visited files)
        function renderTableView() {
            const container = document.getElementById('contentContainer');
            const files = Array.from(visitedFiles).sort();
            
            if (files.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No files visited yet</h3><p>Start by loading a markdown file to begin navigation.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="table-view active">
                    <div class="table-header">
                        <div>File</div>
                        <div>Path</div>
                    </div>
                    ${files.map(file => {
                        const escapedFile = file.replace(/'/g, "\\'");
                        return `<div class="table-row" onclick="loadFile('${escapedFile}')">
                            <div class="name">${file.split('/').pop().replace('.md', '')}</div>
                            <div class="name" style="color: #858585;">${file}</div>
                        </div>`;
                    }).join('')}
                </div>
            `;
        }

        function showError(message) {
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1e1e1e; color: #f48771;">
                    <div class="error" style="margin: 0; max-width: 500px;">
                        <h3>Error</h3>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.view === 'table') {
                    renderTableView();
                } else if (currentPath) {
                    loadFile(currentPath);
                }
            });
        });

        // Dialog functions
        function generateUrl() {
            let baseUrl = document.getElementById('baseUrl').value.trim();
            const secret = document.getElementById('secretKey').value.trim();
            let startFile = document.getElementById('startFile').value.trim();
            const fileListText = document.getElementById('presetFiles').value || '';

            if (!baseUrl || !secret) {
                alert('Please enter Base URL and Secret Key');
                return;
            }

            // If baseUrl contains a filename (has .md or .base extension), split it
            if (!startFile && (baseUrl.match(/\.md$/i) || baseUrl.match(/\.base$/i))) {
                const lastSlash = baseUrl.lastIndexOf('/');
                if (lastSlash > 0) {
                    startFile = baseUrl.substring(lastSlash + 1);
                    baseUrl = baseUrl.substring(0, lastSlash);
                }
            }

            const config = { url: baseUrl, secret };
            if (startFile) config.file = startFile;
            
            const files = fileListText.split('\n').map(f => f.trim()).filter(f => f);
            if (files.length > 0) config.files = files;

            const encoded = btoa(JSON.stringify(config));
            const shareableUrl = window.location.origin + window.location.pathname + '#' + encoded;
            
            document.getElementById('shareableUrl').value = shareableUrl;
            document.getElementById('generatedUrl').style.display = 'block';
        }

        function loadFromInput() {
            let baseUrlInput = document.getElementById('baseUrl').value.trim();
            const secret = document.getElementById('secretKey').value.trim();
            let startFile = document.getElementById('startFile').value.trim();
            const fileListText = document.getElementById('presetFiles').value || '';

            if (!baseUrlInput || !secret) {
                alert('Please enter Base URL and Secret Key');
                return;
            }

            // Split URL if it contains a filename
            if (!startFile && (baseUrlInput.match(/\.md$/i) || baseUrlInput.match(/\.base$/i))) {
                const lastSlash = baseUrlInput.lastIndexOf('/');
                if (lastSlash > 0) {
                    startFile = baseUrlInput.substring(lastSlash + 1);
                    baseUrlInput = baseUrlInput.substring(0, lastSlash);
                }
            }

            const config = { url: baseUrlInput, secret };
            if (startFile) config.file = startFile;
            
            // Parse file list and add to cache
            const files = fileListText.split('\n').map(f => f.trim()).filter(f => f);
            if (files.length > 0) {
                config.files = files;
                files.forEach(f => {
                    const name = f.split('/').pop();
                    const baseName = name.replace(/\.[^.]+$/, ''); // Remove last extension
                    // Cache with full name, base name, and base name without any extension
                    fileCache[name] = f;
                    fileCache[baseName] = f;
                    if (!allKnownFiles.includes(f)) {
                        allKnownFiles.push(f);
                    }
                });
            }

            // Save to sessionStorage
            sessionStorage.setItem('vaultConfig', JSON.stringify(config));
            saveFileCache();
            
            // Set globals
            baseUrl = baseUrlInput;
            secretKey = secret;
            
            // Hide dialog and load
            document.getElementById('openDialog').classList.add('hidden');
            
            // Load the file
            if (startFile) {
                loadFile(startFile);
            } else {
                document.getElementById('contentContainer').innerHTML = '<div class="empty-state"><h3>Welcome</h3><p>Select a file from the sidebar or use the table view.</p></div>';
            }
        }

        function copyUrl() {
            const urlInput = document.getElementById('shareableUrl');
            urlInput.select();
            document.execCommand('copy');
            alert('URL copied to clipboard!');
        }

        function openDialog() {
            document.getElementById('openDialog').classList.remove('hidden');
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const main = document.getElementById('main');
            sidebar.classList.toggle('mobile-open');
            main.classList.toggle('full-width');
        }

        // Load lazy images with authentication header
        function loadLazyImages() {
            const lazyImages = document.querySelectorAll('img.lazy-image');
            lazyImages.forEach(img => {
                if (img.dataset.loaded) return;
                
                const url = img.dataset.src;
                const secret = img.dataset.secret;
                
                if (!url || !secret) return;
                
                fetch(url, {
                    method: 'GET',
                    headers: {
                        'x-secret-key': secret
                    }
                })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    img.src = blobUrl;
                    img.dataset.loaded = 'true';
                })
                .catch(error => {
                    console.error('Failed to load image:', url, error);
                    img.style.display = 'none';
                });
            });
        }

        // Call loadLazyImages after content is rendered
        const originalLoadFile = loadFile;
        loadFile = async function(path) {
            await originalLoadFile(path);
            // Load images after a short delay to ensure DOM is ready
            setTimeout(loadLazyImages, 100);
        };

        // Check for URL fragment on load
        let hasUrlFragment = false;
        function checkUrlFragment() {
            const fragment = window.location.hash.slice(1);
            if (fragment) {
                hasUrlFragment = true;
                // Load file cache from fragment config if present
                try {
                    const config = JSON.parse(atob(fragment));
                    if (config.files) {
                        config.files.forEach(f => {
                            const name = f.split('/').pop();
                            const baseName = name.replace(/\.[^.]+$/, ''); // Remove last extension
                            // Cache both with full name and base name
                            fileCache[name] = f;
                            fileCache[baseName] = f;
                            // Add to all known files
                            if (!allKnownFiles.includes(f)) {
                                allKnownFiles.push(f);
                            }
                        });
                    }
                } catch (e) {}
                return true;
            }
            
            // Check sessionStorage for saved config
            const savedConfig = sessionStorage.getItem('vaultConfig');
            if (savedConfig) {
                try {
                    const config = JSON.parse(savedConfig);
                    if (config.url && config.secret) {
                        baseUrl = config.url;
                        secretKey = config.secret;
                        
                        // Load file cache
                        const cachedFiles = sessionStorage.getItem('fileCache');
                        if (cachedFiles) {
                            fileCache = JSON.parse(cachedFiles);
                        }
                        
                        // Load all known files
                        const knownFiles = sessionStorage.getItem('allKnownFiles');
                        if (knownFiles) {
                            allKnownFiles = JSON.parse(knownFiles);
                        }
                        
                        if (config.files) {
                            config.files.forEach(f => {
                                const name = f.split('/').pop();
                                const baseName = name.replace(/\.[^.]+$/, ''); // Remove last extension
                                fileCache[name] = f;
                                fileCache[baseName] = f;
                                if (!allKnownFiles.includes(f)) {
                                    allKnownFiles.push(f);
                                }
                            });
                        }
                        
                        if (config.file) {
                            return true;
                        }
                    }
                } catch (e) {
                    sessionStorage.removeItem('vaultConfig');
                }
            }
            
            return false;
        }

        // Save file cache and known files to sessionStorage
        function saveFileCache() {
            sessionStorage.setItem('fileCache', JSON.stringify(fileCache));
            sessionStorage.setItem('allKnownFiles', JSON.stringify(allKnownFiles));
        }

        // Initialize
        init = async function() {
            if (hasInitialized) return;
            hasInitialized = true;
            
            console.log('Init called, fragment:', window.location.hash);
            const hasFragment = checkUrlFragment();
            console.log('Has fragment:', hasFragment, 'hasUrlFragment:', hasUrlFragment);
            
            if (!hasFragment) {
                // Show dialog only if no fragment and no saved config
                console.log('Showing dialog');
                document.getElementById('openDialog').classList.remove('hidden');
                return;
            }
            
            // Load from fragment or sessionStorage
            let config;
            if (hasUrlFragment) {
                config = parseFragment();
            } else {
                config = JSON.parse(sessionStorage.getItem('vaultConfig'));
            }
            
            console.log('Parsed config:', config);
            
            if (!config) return;

            // Split URL if it contains a filename
            let url = config.url;
            let startFile = config.file || config.start || '';
            
            // If no starting file but we have a files list, use the first one
            if (!startFile && config.files && config.files.length > 0) {
                startFile = config.files[0];
            }
            
            if (!startFile && (url.match(/\.md$/i) || url.match(/\.base$/i))) {
                const lastSlash = url.lastIndexOf('/');
                if (lastSlash > 0) {
                    startFile = url.substring(lastSlash + 1);
                    url = url.substring(0, lastSlash);
                }
            }
            
            // Decode URL-encoded filename if needed
            if (startFile && startFile.includes('%')) {
                try {
                    startFile = decodeURIComponent(startFile);
                } catch (e) {
                    console.warn('Failed to decode filename:', startFile);
                }
            }

            baseUrl = url;
            secretKey = config.secret;
            
            const container = document.getElementById('contentContainer');
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

            try {
                if (startFile) {
                    await loadFile(startFile);
                } else {
                    container.innerHTML = '<div class="empty-state"><h3>Welcome</h3><p>Provide a starting file in the URL fragment: {url, secret, file}</p></div>';
                }
            } catch (e) {
                container.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
            }
        };

        // Run init
        init();
    