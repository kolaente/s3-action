# S3 Compatible Upload Action

This GitHub Action uploads files to an S3 compatible storage service.

## Inputs

* `s3-access-key-id`: **Required.** S3 Access Key ID for authentication.
* `s3-secret-access-key`: **Required.** S3 Secret Access Key for authentication.
* `s3-endpoint`: **Required.** S3 compatible endpoint URL (e.g., `https://s3.example.com`).
* `s3-bucket`: **Required.** S3 bucket name.
* `files`: **Required.** Glob pattern for files to upload (e.g., `dist/**/*`).
* `target-path`: **Required.** Target path in the S3 bucket (e.g., `uploads/`). Defaults to `/` (root of the bucket).
* `strip-path-prefix`: *Optional.* Path prefix to strip from uploaded files (e.g., `dist/` will strip this prefix from all uploaded files). Defaults to '' (no stripping).
* `s3-region`: *Optional.* S3 region (e.g., `us-east-1`). Required for standard AWS S3, often optional for S3-compatible services.
* `s3-api-version`: *Optional.* S3 API version (e.g., `2006-03-01`). Optional, defaults to the latest.

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
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build your project (if needed)
        # ... your build steps here ...

      - name: Upload to S3
        uses: ./ # Assuming your action is in the root of your repository
        with:
          s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }} # Updated input name
          s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }} # Updated input name
          s3-endpoint: 'https://your-s3-compatible-endpoint.com'
          s3-bucket: 'your-bucket-name'
          files: 'dist/**/*' # Example glob pattern
          target-path: 'website-assets/' # Example target path
          s3-region: 'us-east-1' # Updated input name and example value (if needed)
          s3-api-version: '2006-03-01' # Updated input name and example value (if needed)
