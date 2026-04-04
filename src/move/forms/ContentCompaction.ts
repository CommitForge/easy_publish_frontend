export type ContentCompactionFormat = 'json' | 'xml' | 'text';

export const CONTENT_ZIP_ENCODING_PREFIX = 'EPZIP1:gzip+base64:';

export type ContentCompactionResult = {
  content: string;
  format: ContentCompactionFormat;
  valid: boolean;
  compacted: boolean;
};

type CompactContentOptions = {
  autoCompressEnabled: boolean;
};

type PrepareContentOptions = {
  autoCompressEnabled: boolean;
  autoZipEnabled: boolean;
};

export type ContentPublishPreparationResult = ContentCompactionResult & {
  zipped: boolean;
  zipSupported: boolean;
};

export type ContentDecodeResult = {
  content: string;
  zipped: boolean;
  decoded: boolean;
};

function isLikelyJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true;
  return /"\s*:\s*/.test(trimmed);
}

function isLikelyXml(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith('<')) return false;
  if (/^<\?xml[\s>]/i.test(trimmed)) return true;
  return /<([A-Za-z_][\w:.-]*)(\s[^>]*)?>/.test(trimmed);
}

function compactXmlPreservingValues(xmlContent: string): string | null {
  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(xmlContent, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length > 0) return null;

    const declaration = xmlContent.trim().match(/^<\?xml[\s\S]*?\?>/i)?.[0] ?? '';
    const serializer = new XMLSerializer();
    let serialized = serializer.serializeToString(parsed).replace(/>\s+</g, '><').trim();

    if (declaration && !/^<\?xml/i.test(serialized)) {
      serialized = `${declaration}${serialized}`;
    }

    return serialized;
  } catch {
    return null;
  }
}

export function compactContentForPublish(
  content: string,
  options: CompactContentOptions
): ContentCompactionResult {
  const raw = content ?? '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      content: raw,
      format: 'text',
      valid: true,
      compacted: false,
    };
  }

  const likelyJson = isLikelyJson(trimmed);
  const likelyXml = isLikelyXml(trimmed);
  const startsWith = trimmed[0] ?? '';

  if (startsWith === '{' || startsWith === '[' || (likelyJson && !likelyXml)) {
    try {
      const parsed = JSON.parse(trimmed);
      const shouldCompact = options.autoCompressEnabled;

      return {
        content: shouldCompact ? JSON.stringify(parsed) : raw,
        format: 'json',
        valid: true,
        compacted: shouldCompact,
      };
    } catch {
      return {
        content: raw,
        format: 'json',
        valid: false,
        compacted: false,
      };
    }
  }

  if (startsWith === '<' || (likelyXml && !likelyJson)) {
    const compactedXml = compactXmlPreservingValues(trimmed);
    if (!compactedXml) {
      return {
        content: raw,
        format: 'xml',
        valid: false,
        compacted: false,
      };
    }

    const shouldCompact = options.autoCompressEnabled;
    return {
      content: shouldCompact ? compactedXml : raw,
      format: 'xml',
      valid: true,
      compacted: shouldCompact,
    };
  }

  return {
    content: raw,
    format: 'text',
    valid: true,
    compacted: false,
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function fromBase64(base64Content: string): Uint8Array {
  const binary = atob(base64Content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function supportsGzipCompression(): boolean {
  if (typeof CompressionStream === 'undefined') return false;

  try {
    // Some runtimes expose CompressionStream but fail when instantiated for gzip.
    // We probe once to avoid hanging/failing later during submit.
    new CompressionStream('gzip');
    return true;
  } catch {
    return false;
  }
}

function supportsGzipDecompression(): boolean {
  if (typeof DecompressionStream === 'undefined') return false;

  try {
    new DecompressionStream('gzip');
    return true;
  } catch {
    return false;
  }
}

async function gzipToBase64(content: string): Promise<string> {
  // Pipe with an active reader to avoid potential backpressure stalls
  // that can happen with manual writer-only usage in some browsers.
  const inputStream = new Blob([content]).stream();
  const compressedStream = inputStream.pipeThrough(
    new CompressionStream('gzip')
  );
  const compressedBuffer = await new Response(compressedStream).arrayBuffer();
  return toBase64(new Uint8Array(compressedBuffer));
}

async function gunzipBase64Content(base64Content: string): Promise<string> {
  const gzBytes = fromBase64(base64Content);
  const gzCopy = new Uint8Array(gzBytes.byteLength);
  gzCopy.set(gzBytes);
  const inputStream = new Blob([gzCopy.buffer]).stream();
  const decompressedStream = inputStream.pipeThrough(
    new DecompressionStream('gzip')
  );
  return new Response(decompressedStream).text();
}

export function isZipEncodedContent(content: string): boolean {
  return (content ?? '').startsWith(CONTENT_ZIP_ENCODING_PREFIX);
}

export async function decodeContentForDisplay(
  content: string
): Promise<ContentDecodeResult> {
  const raw = content ?? '';
  if (!isZipEncodedContent(raw)) {
    return {
      content: raw,
      zipped: false,
      decoded: false,
    };
  }

  if (!supportsGzipDecompression()) {
    return {
      content: raw,
      zipped: true,
      decoded: false,
    };
  }

  const payload = raw.slice(CONTENT_ZIP_ENCODING_PREFIX.length).trim();
  if (!payload) {
    return {
      content: raw,
      zipped: true,
      decoded: false,
    };
  }

  try {
    const unzipped = await gunzipBase64Content(payload);
    return {
      content: unzipped,
      zipped: true,
      decoded: true,
    };
  } catch {
    return {
      content: raw,
      zipped: true,
      decoded: false,
    };
  }
}

export async function prepareContentForPublish(
  content: string,
  options: PrepareContentOptions
): Promise<ContentPublishPreparationResult> {
  const compacted = compactContentForPublish(content, {
    autoCompressEnabled: options.autoCompressEnabled,
  });

  if (!options.autoZipEnabled) {
    return {
      ...compacted,
      zipped: false,
      zipSupported: true,
    };
  }

  if (!supportsGzipCompression()) {
    return {
      ...compacted,
      zipped: false,
      zipSupported: false,
    };
  }

  const zippedPayload = await gzipToBase64(compacted.content);
  return {
    ...compacted,
    content: `${CONTENT_ZIP_ENCODING_PREFIX}${zippedPayload}`,
    zipped: true,
    zipSupported: true,
  };
}
