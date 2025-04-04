const core = require('@actions/core');
const glob = require('@actions/glob');
const Minio = require('minio'); // Changed import
const path = require('path');
const fs = require('fs');

async function run() {
  try {
    const s3AccessKeyId = core.getInput('s3-access-key-id');
    const s3SecretAccessKey = core.getInput('s3-secret-access-key');
    const s3Endpoint = core.getInput('s3-endpoint');
    const s3Bucket = core.getInput('s3-bucket');
    const filesGlob = core.getInput('files');
    const excludeGlob = core.getInput('exclude');
    const targetPath = core.getInput('target-path');
    const stripPathPrefix = core.getInput('strip-path-prefix');
    const s3Region = core.getInput('s3-region');
    const retryCount = parseInt(core.getInput('retry-count'), 10) || 3;

    core.info(`Using S3 Endpoint: ${s3Endpoint}`);
    core.info(`Uploading to S3 Bucket: ${s3Bucket}`);
    core.info(`Using files glob pattern: ${filesGlob}`);
    if (excludeGlob) {
      core.info(`Excluding files matching: ${excludeGlob}`);
    }
    core.info(`Target path in S3: ${targetPath}`);
    if (stripPathPrefix) {
      core.info(`Stripping path prefix: ${stripPathPrefix}`);
    }
    if (s3Region) {
      core.info(`Using S3 Region: ${s3Region}`);
    }
    core.info(`Will retry failed uploads up to ${retryCount} times`);

    const useSSL = s3Endpoint.startsWith('https://'); // Infer useSSL from endpoint

    const minioClient = new Minio.Client({ // Changed to Minio.Client
      endPoint: new URL(s3Endpoint).hostname, // Extract hostname from endpoint URL
      port: new URL(s3Endpoint).port ? parseInt(new URL(s3Endpoint).port, 10) : (useSSL ? 443 : 80), // Extract port or use defaults
      useSSL: useSSL, // Determine useSSL based on endpoint protocol
      accessKey: s3AccessKeyId,
      secretKey: s3SecretAccessKey,
      region: s3Region || undefined, // Region is optional and can be undefined if not provided
    });

    const globber = await glob.create(filesGlob);
    let filesToUpload = await globber.glob();

    // Handle exclusions if specified
    if (excludeGlob) {
      const excludeGlobber = await glob.create(excludeGlob);
      const excludedFiles = new Set(await excludeGlobber.glob());
      filesToUpload = filesToUpload.filter(file => !excludedFiles.has(file));
      if (excludedFiles.size > 0) {
        core.info(`Excluded files ${Array.from(excludedFiles).join(', ')} from upload.`);
      } else {
        core.info('No files matched the exclude pattern.');
      }
    }

    if (filesToUpload.length === 0) {
      core.warning('No files found matching the glob pattern or all files were excluded. Nothing to upload.');
      return;
    }

    core.info(`Found ${filesToUpload.length} files to upload.`);

    // Helper function to upload a file with retries
    async function uploadFileWithRetry(filePath, s3Key, displayPath, attemptsLeft) {
      try {
        await minioClient.fPutObject(s3Bucket, s3Key, filePath);
        core.info(`Uploaded ${displayPath} successfully.`);
        return true;
      } catch (uploadError) {
        if (attemptsLeft > 0) {
          core.warning(`Error uploading ${displayPath}: ${uploadError.message}. Retrying... (${attemptsLeft} attempts left)`);
          return uploadFileWithRetry(filePath, s3Key, displayPath, attemptsLeft - 1);
        } else {
          core.error(`Error uploading ${displayPath} after all retry attempts: ${JSON.stringify(uploadError)}`);
          throw uploadError;
        }
      }
    }

    for (const filePath of filesToUpload) {
      const relativePath = path.relative(process.env.GITHUB_WORKSPACE, filePath); // Get path relative to workspace
      let s3Key = relativePath
        .replace(/^\/+/, '') // Remove leading slash
        .replace(/\\/g, '/'); // Convert any Windows backslashes to forward slashes

      // Strip the prefix if it exists
      if (stripPathPrefix && s3Key.startsWith(stripPathPrefix)) {
        s3Key = s3Key.slice(stripPathPrefix.length);
      }

      s3Key = path.posix.join(targetPath, s3Key).replace(/^\/+/, '')
      
      let displayPath = relativePath.replace(/\\/g, '/');
      if (stripPathPrefix && displayPath.startsWith(stripPathPrefix)) {
        displayPath = displayPath.slice(stripPathPrefix.length);
      }
      
      core.info(`Uploading ${displayPath} to s3://${s3Bucket}/${s3Key}`);

      try {
        await uploadFileWithRetry(filePath, s3Key, displayPath, retryCount);
      } catch (uploadError) {
        core.setFailed(`File upload failed for ${displayPath} after ${retryCount + 1} attempts.`);
        return;
      }
    }

    core.info('All files uploaded successfully!');

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
