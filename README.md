# Obsidian Viewer

A static web page that allows you to view Obsidian-style markdown files from S3-compatible storage.

## Features

- **Obsidian-flavored markdown**: Supports internal links `[[file]]`, images `![[img.png]]`, callouts, and more
- **S3-compatible storage**: Load files from any S3-compatible bucket via URL fragment configuration
- **Authentication**: Uses `x-secret-key` header for secure access to private buckets
- **Navigation**: Click internal links to navigate between files, with path caching in sessionStorage
- **Mobile responsive**: Sidebar toggle with hamburger menu for mobile devices
- **Shareable links**: URL fragments encode configuration for easy sharing
- **File list**: Browse all known files in the sidebar

## Usage

### Opening a vault

The URL fragment contains **base64-encoded JSON** with your S3 configuration.

**Example:**

1. Create your configuration object:
```json
{
  "url": "https://your-s3-bucket.com",
  "secret": "your-secret-key-uuid",
  "file": "notes/my-note.md"
}
```

2. Base64 encode it (online tools or command line):
```bash
echo -n '{"url":"https://your-s3-bucket.com","secret":"your-secret-key-uuid","file":"notes/my-note.md"}' | base64
```

Output: `eyJ1cmwiOiJodHRwczovL3lvdXI...`

3. Append to the page URL:
```
https://your-obsidian-viewer.com/#eyJ1cmwiOiJodHRwczovL3lvdXI...
```

**Configuration parameters:**
- `url` (required): Base URL of your S3 bucket
- `secret` (required): Secret key for authentication (sent as `x-secret-key` header)
- `file` (optional): Initial file to load
- `files` (optional): JSON array of pre-known file paths

### Manual vault opening

Click **"Open Vault"** button to enter your S3 configuration via a dialog (no need to manually base64 encode).

### Navigation

- **Internal links**: Click `[[file]]` links to navigate to other notes
- **Images**: `![[image.png]]` and `![alt](url)` are fetched with authentication and displayed as blobs
- **Direct images**: Click on PNG/JPG files in the sidebar for full view
- **File browser**: Use the sidebar to browse all known files
- **Path history**: Visited files are cached in sessionStorage for quick navigation
- **Shareable links**: Current state (URL, secret, current file) is encoded in the URL hash for sharing

### Navigation

- Click `[[internal links]]` to navigate to other notes
- Images are fetched with authentication and displayed as blobs
- Direct image files (PNG/JPG) can be clicked for full view
- Use the sidebar to browse all known files

## Deployment

### GitHub Pages

This project includes a GitHub Action workflow for automatic deployment to GitHub Pages:

1. Push to the `main` branch
2. Go to Settings → Pages and select "GitHub Actions" as source
3. Your site will be deployed at `https://<username>.github.io/<repo-name>/`

### Bucket Policy

For S3-compatible storage, configure a bucket policy to allow access with the `x-secret-key` header authentication:

```json
{
  "syntax_version": "2025-03-01",
  "statement": [
    {
      "effect": "allow",
      "principal": ["*"],
      "action": ["s3:GetObject"],
      "resource": ["crn:eu-west-1:s3:object:tenant_xxx/project_xxx/bucket_xxx/path/*"],
      "condition": {
        "StringEquals": {
          "header/x-secret-key": ["your-secret-key-uuid"]
        }
      }
    }
  ]
}
```

Replace:
- `resource`: Your bucket's CRN path (replace tenant, project, bucket IDs)
- `header/x-secret-key`: Your secret key UUID

The secret key is then passed in the URL hash: `#{url:..., secret: your-secret-key-uuid}`

## Files

- `index.html` - Main HTML structure and styles
- `app.js` - JavaScript logic for markdown parsing, navigation, and authentication

## License

MIT
