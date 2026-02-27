/**
 * Upload utility for R2 storage with worker proxy support
 * Handles both direct R2 uploads and worker proxy uploads with multipart support
 * for React Native
 */

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

// NOTE:
// Cloudflare Workers have practical request-size and reliability limits for single-request uploads.
// Using multipart earlier for large media (especially videos) reduces "stuck at ~94%" reports.
const DEFAULT_MULTIPART_THRESHOLD = 90 * 1024 * 1024; // 90MB
const VIDEO_MULTIPART_THRESHOLD = 25 * 1024 * 1024; // 25MB

/**
 * Sleep helper for retry delays
 * @param {number} ms
 */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Check if HTTP status is retriable
 * @param {number} status
 */
function isRetriableStatus(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Fetch with timeout using AbortController
 * @param {RequestInfo} input
 * @param {RequestInit} init
 * @param {number} timeoutMs
 */
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic
 * @param {RequestInfo} input
 * @param {RequestInit} init
 * @param {{ timeoutMs: number, retries: number, retryBaseDelayMs?: number }} opts
 */
async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  opts: { timeoutMs: number; retries: number; retryBaseDelayMs?: number },
) {
  const { timeoutMs, retries, retryBaseDelayMs = 400 } = opts;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (res.ok) return res;

      if (attempt < retries && isRetriableStatus(res.status)) {
        await sleep(retryBaseDelayMs * Math.pow(2, attempt));
        continue;
      }

      return res;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await sleep(retryBaseDelayMs * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export interface SignedUrlResponse {
  signedUrl: string;
  downloadUrl?: string; // Some APIs use downloadUrl
  imageUrl?: string; // Other APIs use imageUrl
  uploadToken?: string;
  useWorkerProxy?: boolean;
  multipart?: {
    initUrl: string;
    chunkUrl: string;
    completeUrl: string;
    abortUrl: string;
  };
}

export interface ProgressEvent {
  loaded: number;
  total: number;
  fraction: number;
  percentage: number;
}

/**
 * Upload a file to storage
 * Automatically handles worker proxy vs direct R2 upload based on server response
 *
 * @param {Blob} fileBlob - The file blob to upload
 * @param {SignedUrlResponse} signedUrlResponse - Response from getSignedUrl API
 * @param {string} contentType - MIME type of the file
 * @param {function} [onProgress] - Progress callback (0-1)
 * @returns {Promise<string>} The download URL
 */
export async function uploadFile(
  fileBlob: Blob,
  signedUrlResponse: SignedUrlResponse,
  contentType: string,
  onProgress?: (event: ProgressEvent) => void,
): Promise<string> {
  console.log("uploadFile called", {
    fileBlob,
    signedUrlResponse,
    contentType,
  });
  const { signedUrl, uploadToken, useWorkerProxy, multipart } =
    signedUrlResponse;

  // Use downloadUrl if present, otherwise fallback to imageUrl
  const downloadUrl =
    signedUrlResponse.downloadUrl || signedUrlResponse.imageUrl;

  if (!signedUrl) {
    console.log("uploadFile missing signedUrl");
    throw new Error("signedUrl is required");
  }

  const looksLikeWorkerUploadEndpoint =
    typeof signedUrl === "string" && /\/api\/upload(\/|$)/.test(signedUrl);
  if (looksLikeWorkerUploadEndpoint && (!useWorkerProxy || !uploadToken)) {
    throw new Error(
      "Invalid upload config: worker upload URL provided without upload token",
    );
  }

  if (
    useWorkerProxy &&
    uploadToken &&
    looksLikeWorkerUploadEndpoint &&
    !downloadUrl
  ) {
    throw new Error(
      "Invalid upload config: worker proxy enabled but downloadUrl missing",
    );
  }

  // For worker proxy mode
  if (useWorkerProxy && uploadToken) {
    const multipartThreshold = (contentType || "").startsWith("video/")
      ? VIDEO_MULTIPART_THRESHOLD
      : DEFAULT_MULTIPART_THRESHOLD;

    // Check if file size warrants multipart upload
    if (fileBlob.size > multipartThreshold && multipart) {
      return uploadMultipart(
        fileBlob,
        uploadToken,
        multipart,
        downloadUrl,
        contentType,
        onProgress,
      );
    }
    return uploadSingle(
      fileBlob,
      signedUrl,
      uploadToken,
      downloadUrl,
      contentType,
      onProgress,
      multipart,
    );
  }

  // Direct upload to R2/S3 via presigned URL
  return uploadDirect(
    fileBlob,
    signedUrl,
    downloadUrl,
    contentType,
    onProgress,
  );
}

/**
 * Direct upload to R2 via presigned URL (original flow)
 */
async function uploadDirect(
  fileBlob: Blob,
  signedUrl: string,
  downloadUrl?: string,
  contentType?: string,
  onProgress?: (event: ProgressEvent) => void,
): Promise<string> {
  console.log("uploadDirect start", {
    signedUrl,
    downloadUrl,
    contentType,
    size: fileBlob?.size,
  });
  // Use uploadWithProgress for better progress tracking if requested
  if (onProgress) {
    await uploadWithProgress(
      signedUrl,
      fileBlob,
      contentType || "application/octet-stream",
      undefined,
      onProgress,
    );
    const resultUrl = downloadUrl || signedUrl.split("?")[0];
    console.log("uploadDirect with progress resultUrl", resultUrl);
    return resultUrl;
  }

  const response = await fetchWithRetry(
    signedUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body: fileBlob,
    },
    { timeoutMs: 10 * 60 * 1000, retries: 2 },
  );

  console.log("uploadDirect response status", response.status);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("uploadDirect failed text", text);
    throw new Error(`Upload failed with status ${response.status}: ${text}`);
  }

  const resultUrl = downloadUrl || signedUrl.split("?")[0];
  console.log("uploadDirect succeeded, resultUrl", resultUrl);
  return resultUrl;
}

/**
 * Single file upload via worker proxy
 */
async function uploadSingle(
  fileBlob: Blob,
  uploadUrl: string,
  uploadToken: string,
  downloadUrl?: string,
  contentType?: string,
  onProgress?: (event: ProgressEvent) => void,
  multipart?: any,
): Promise<string> {
  console.log("uploadSingle start", {
    uploadUrl,
    uploadToken,
    downloadUrl,
    contentType,
    size: fileBlob?.size,
  });
  // Use uploadWithProgress for better progress tracking if requested
  if (onProgress) {
    try {
      const result = await uploadWithProgress(
        uploadUrl,
        fileBlob,
        contentType || "application/octet-stream",
        uploadToken,
        onProgress,
      );
      console.log("uploadSingle with progress result", result);
      return result?.downloadUrl || downloadUrl || uploadUrl;
    } catch (e) {
      console.error("uploadSingle progress error", e);
      const shouldFallback =
        multipart &&
        fileBlob?.size > 0 &&
        (((contentType || "").startsWith("video/") &&
          fileBlob.size > 10 * 1024 * 1024) ||
          fileBlob.size > DEFAULT_MULTIPART_THRESHOLD);

      if (shouldFallback) {
        console.log("uploadSingle falling back to multipart");
        return uploadMultipart(
          fileBlob,
          uploadToken,
          multipart,
          downloadUrl,
          contentType,
          onProgress,
        );
      }

      throw e;
    }
  }

  const response = await fetchWithRetry(
    uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "X-Upload-Token": uploadToken,
      },
      body: fileBlob,
    },
    { timeoutMs: 10 * 60 * 1000, retries: 2 },
  );

  console.log("uploadSingle response status", response.status);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("uploadSingle failed text", text);
    throw new Error(`Upload failed with status ${response.status}: ${text}`);
  }

  try {
    const json = await response.json();
    console.log("uploadSingle success json", json);
    return json.downloadUrl || downloadUrl || uploadUrl;
  } catch {
    console.log("uploadSingle no json, falling back to urls");
    return downloadUrl || uploadUrl;
  }
}

/**
 * Multipart upload for large files via worker proxy
 */
async function uploadMultipart(
  fileBlob: Blob,
  uploadToken: string,
  multipart: any,
  downloadUrl?: string,
  contentType?: string,
  onProgress?: (event: ProgressEvent) => void,
): Promise<string> {
  const { initUrl, chunkUrl, completeUrl, abortUrl } = multipart;

  // Initialize multipart upload
  const initResponse = await fetchWithRetry(
    initUrl,
    {
      method: "POST",
      headers: {
        "X-Upload-Token": uploadToken,
      },
    },
    { timeoutMs: 60 * 1000, retries: 2 },
  );

  if (!initResponse.ok) {
    const text = await initResponse.text().catch(() => "");
    throw new Error(
      `Failed to initialize multipart upload: ${initResponse.status} ${text}`,
    );
  }

  const { uploadId } = await initResponse.json();

  const totalChunks = Math.ceil(fileBlob.size / CHUNK_SIZE);
  const uploadedParts = [];
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBlob.size);
      const chunk = fileBlob.slice(start, end);
      const partNumber = i + 1;

      const chunkResponse = await fetchWithRetry(
        chunkUrl,
        {
          method: "PUT",
          headers: {
            "X-Upload-Token": uploadToken,
            "X-Upload-Id": uploadId,
            "X-Chunk-Index": partNumber.toString(),
            "Content-Type": "application/octet-stream",
          },
          body: chunk,
        },
        { timeoutMs: 5 * 60 * 1000, retries: 3 },
      );

      if (!chunkResponse.ok) {
        const text = await chunkResponse.text().catch(() => "");
        throw new Error(
          `Failed to upload chunk ${partNumber}: ${chunkResponse.status} ${text}`,
        );
      }

      const { partNumber: returnedPartNumber, etag } =
        await chunkResponse.json();

      uploadedParts.push({ partNumber: returnedPartNumber, etag });
      uploadedBytes += chunk.size;

      if (onProgress) {
        const fraction = fileBlob.size ? uploadedBytes / fileBlob.size : 0;
        onProgress({
          loaded: uploadedBytes,
          total: fileBlob.size,
          fraction,
          percentage: fraction * 100,
        });
      }
    }

    // Complete multipart upload
    const completeResponse = await fetchWithRetry(
      completeUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Upload-Token": uploadToken,
        },
        body: JSON.stringify({
          uploadId,
          parts: uploadedParts,
        }),
      },
      { timeoutMs: 60 * 1000, retries: 2 },
    );

    if (!completeResponse.ok) {
      const text = await completeResponse.text().catch(() => "");
      throw new Error(
        `Failed to complete multipart upload: ${completeResponse.status} ${text}`,
      );
    }

    const result = await completeResponse.json();
    onProgress?.({
      loaded: fileBlob.size,
      total: fileBlob.size,
      fraction: 1,
      percentage: 100,
    });
    return result.downloadUrl || downloadUrl;
  } catch (error) {
    console.error("Multipart upload error:", error);
    // Try to abort the upload
    try {
      await fetchWithTimeout(
        abortUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Upload-Token": uploadToken,
          },
          body: JSON.stringify({ uploadId }),
        },
        30 * 1000,
      );
    } catch {
      // Ignore abort errors
    }
    throw error;
  }
}

/**
 * Upload with XMLHttpRequest for progress tracking
 * Supports worker proxy mode
 *
 * @param {string} uploadUrl - The upload URL
 * @param {Blob} fileBlob - The file blob
 * @param {string} contentType - MIME type
 * @param {string} [uploadToken] - Token for worker proxy (optional)
 * @param {function} [onProgress] - Progress callback (0-1)
 * @returns {Promise<any>}
 */
export function uploadWithProgress(
  uploadUrl: string,
  fileBlob: Blob,
  contentType: string,
  uploadToken?: string,
  onProgress?: (event: ProgressEvent) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.timeout = 15 * 60 * 1000;

    // Add upload token header if using worker proxy
    if (uploadToken) {
      xhr.setRequestHeader("X-Upload-Token", uploadToken);
    }

    const expectedTotal =
      typeof fileBlob?.size === "number" ? fileBlob.size : 0;
    let lastLoaded = 0;

    const emitProgress = (loaded: number, total: number) => {
      const safeTotal = total > 0 ? total : expectedTotal;
      const safeLoaded = Math.max(
        lastLoaded,
        Math.min(loaded, safeTotal || loaded),
      );
      lastLoaded = safeLoaded;

      const fraction = safeTotal > 0 ? safeLoaded / safeTotal : 0;
      onProgress?.({
        loaded: safeLoaded,
        total: safeTotal,
        fraction,
        percentage: fraction * 100,
      });
    };

    xhr.upload.onprogress = (event) => {
      // In React Native, `lengthComputable` can be false even when `loaded` is useful.
      const loaded = typeof event.loaded === "number" ? event.loaded : 0;
      const total =
        event.lengthComputable && typeof event.total === "number"
          ? event.total
          : expectedTotal;
      emitProgress(loaded, total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        emitProgress(expectedTotal || lastLoaded, expectedTotal);

        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          const headerDownloadUrl = xhr.getResponseHeader("X-Download-Url");
          if (headerDownloadUrl) {
            resolve({ downloadUrl: headerDownloadUrl });
            return;
          }
          resolve(null);
        }
      } else {
        const message = xhr.responseText || "";
        reject(
          new Error(
            `Upload failed with status ${xhr.status}${message ? `: ${message}` : ""}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out"));
    };

    xhr.send(fileBlob);
  });
}

export default uploadFile;
