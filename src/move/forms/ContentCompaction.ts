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

function supportsGzipCompression(): boolean {
  return typeof CompressionStream !== 'undefined';
}

async function gzipToBase64(content: string): Promise<string> {
  const input = new TextEncoder().encode(content);
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  await writer.write(input);
  await writer.close();
  const compressedBuffer = await new Response(stream.readable).arrayBuffer();
  return toBase64(new Uint8Array(compressedBuffer));
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
