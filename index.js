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
    const targetPath = core.getInput('target-path');
    const s3Region = core.getInput('s3-region');
    const s3ApiVersion = core.getInput('s3-api-version');

    core.info(`Using S3 Endpoint: ${s3Endpoint}`);
    core.info(`Uploading to S3 Bucket: ${s3Bucket}`);
    core.info(`Using files glob pattern: ${filesGlob}`);
    core.info(`Target path in S3: ${targetPath}`);
    if (s3Region) {
      core.info(`Using S3 Region: ${s3Region}`);
    }
    if (s3ApiVersion) {
      core.info(`Using S3 API Version: ${s3ApiVersion}`);
    }

    const useSSL = s3Endpoint.startsWith('https://'); // Infer useSSL from endpoint

    const minioClient = new Minio.Client({ // Changed to Minio.Client
      endPoint: new URL(s3Endpoint).hostname, // Extract hostname from endpoint URL
      port: new URL(s3Endpoint).port ? parseInt(new URL(s3Endpoint).port, 10) : (useSSL ? 443 : 80), // Extract port or use defaults
      useSSL: useSSL, // Determine useSSL based on endpoint protocol
      accessKey: s3AccessKeyId,
      secretKey: s3SecretAccessKey,
      region: s3Region || undefined, // Region is optional and can be undefined if not provided
      // apiVersion is not directly supported by minio client options.
      // Minio client generally handles API version compatibility.
    });

    const globber = await glob.create(filesGlob);
    const filesToUpload = await globber.glob();

    if (filesToUpload.length === 0) {
      core.warning('No files found matching the glob pattern. Nothing to upload.');
      return;
    }

    core.info(`Found ${filesToUpload.length} files to upload.`);

    for (const filePath of filesToUpload) {
      const relativePath = path.relative(process.env.GITHUB_WORKSPACE, filePath); // Get path relative to workspace
      const s3Key = path.posix.join(targetPath, relativePath).replace(/^\/+/, ''); // Ensure forward slashes and remove leading slash
      core.info(`Uploading ${filePath} to s3://${s3Bucket}/${s3Key}`);

      try {
        await minioClient.fPutObject(s3Bucket, s3Key, filePath); // Using fPutObject from minio
        core.info(`Uploaded ${filePath} successfully.`);
      } catch (uploadError) {
        core.error(`Error uploading ${filePath}: ${uploadError.message}`); // More specific error logging
        core.setFailed(`File upload failed for ${filePath}. See error details in logs.`);
        return; // Stop processing further files if one fails significantly
      }
    }

    core.info('All files uploaded successfully!');

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
