import { useCallback, useEffect, useRef } from 'react';
import { useContentDisplay } from '../../context/ContentDisplayContext.tsx';
import {
  decodeContentForDisplay,
  isZipEncodedContent,
} from './ContentCompaction.ts';

type UseAutoUnzippedContentParams = {
  content: string;
  setContent: (nextContent: string) => void;
};

type UseAutoUnzippedContentResult = {
  applyLoadedContent: (rawContent: string) => void;
  clearLoadedContent: () => void;
  setEditedContent: (nextContent: string) => void;
};

export function useAutoUnzippedContent({
  content,
  setContent,
}: UseAutoUnzippedContentParams): UseAutoUnzippedContentResult {
  const { autoUnzipContent } = useContentDisplay();
  const loadedRawRef = useRef<string | null>(null);
  const tokenRef = useRef(0);

  const applyContentFromRaw = useCallback(
    (rawContent: string) => {
      const raw = rawContent ?? '';
      const token = tokenRef.current + 1;
      tokenRef.current = token;

      if (!autoUnzipContent) {
        setContent(raw);
        return;
      }

      void decodeContentForDisplay(raw).then((decodedResult) => {
        if (tokenRef.current !== token) return;
        setContent(decodedResult.content);
      });
    },
    [autoUnzipContent, setContent]
  );

  const applyLoadedContent = useCallback(
    (rawContent: string) => {
      loadedRawRef.current = rawContent ?? '';
      applyContentFromRaw(rawContent ?? '');
    },
    [applyContentFromRaw]
  );

  const clearLoadedContent = useCallback(() => {
    loadedRawRef.current = null;
  }, []);

  const setEditedContent = useCallback(
    (nextContent: string) => {
      const next = nextContent ?? '';
      const token = tokenRef.current + 1;
      tokenRef.current = token;
      setContent(next);

      if (!autoUnzipContent || !isZipEncodedContent(next)) {
        return;
      }

      void decodeContentForDisplay(next).then((decodedResult) => {
        if (tokenRef.current !== token) return;
        if (!decodedResult.decoded) return;
        setContent(decodedResult.content);
      });
    },
    [autoUnzipContent, setContent]
  );

  useEffect(() => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;

    if (!autoUnzipContent) {
      if (loadedRawRef.current !== null) {
        setContent(loadedRawRef.current);
      }
      return;
    }

    const source = loadedRawRef.current ?? content;
    if (!isZipEncodedContent(source)) return;

    void decodeContentForDisplay(source).then((decodedResult) => {
      if (tokenRef.current !== token) return;
      if (!decodedResult.decoded && loadedRawRef.current === null) return;
      setContent(decodedResult.content);
    });
  }, [autoUnzipContent, setContent]);

  return {
    applyLoadedContent,
    clearLoadedContent,
    setEditedContent,
  };
}
