# S3 Compatible Upload Action

This GitHub Action uploads files to an S3 compatible storage service. It runs seamlessly across Linux, macOS, and Windows runners.

## Inputs

* `s3-access-key-id`: **Required.** S3 Access Key ID for authentication.
* `s3-secret-access-key`: **Required.** S3 Secret Access Key for authentication.
* `s3-endpoint`: **Required.** S3 compatible endpoint URL (e.g., `https://s3.example.com`).
* `s3-bucket`: **Required.** S3 bucket name.
* `files`: **Required.** Glob pattern for files to upload (e.g., `dist/**/*`).
* `exclude`: *Optional.* Glob pattern for files to exclude from upload (e.g., `**/*.tmp`). Defaults to '' (no exclusions).
* `target-path`: **Required.** Target path in the S3 bucket (e.g., `uploads/`). Defaults to `/` (root of the bucket).
* `strip-path-prefix`: *Optional.* Path prefix to strip from uploaded files (e.g., `dist/` will strip this prefix from all uploaded files). Defaults to '' (no stripping).
* `s3-region`: *Optional.* S3 region (e.g., `us-east-1`). Required for standard AWS S3, often optional for S3-compatible services.

## Cross-Platform Support

This action is designed to work consistently across all GitHub-hosted runners:

- Ubuntu Linux
- macOS
- Windows

All file paths and glob patterns are automatically normalized to work correctly on each platform.

## Outputs

This action has no explicit outputs, but it will fail the workflow if the upload process encounters errors.

## Example Usage

```yaml
name: Upload to S3 Compatible Storage

on:
  push:
    branches:
      - main

jobs:
  upload:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v3

      - name: Build your project (if needed)
        # ... your build steps here ...

      - name: Upload to S3
        uses: kolaente/s3-action@v1
        with:
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          s3-endpoint: 'https://your-s3-compatible-endpoint.com'
          s3-bucket: 'your-bucket-name'
          files: 'dist/**/*'
          exclude: 'dist/**/*.map,dist/**/test/**'
          target-path: 'website-assets/'
          strip-path-prefix: 'dist/'
          s3-region: 'us-east-1'

## Pattern Examples

You can use various glob patterns for both including and excluding files:

### Include patterns (`files`):

- `dist/**/*` - All files in the dist directory and subdirectories
- `build/**/*.{js,css}` - Only JavaScript and CSS files in the build directory

### Exclude patterns (`exclude`):

- `**/*.tmp` - Exclude all .tmp files
- `**/*.map,**/*.test.js` - Exclude source maps and test files (comma-separated patterns)
- `dist/**/test/**,dist/**/*.bak` - Exclude test directories and backup files

Note: Multiple exclude patterns can be specified by separating them with commas. All patterns use forward slashes regardless of platform.
