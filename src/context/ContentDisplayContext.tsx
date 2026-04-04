import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ContentDisplayContextValue = {
  autoUnzipContent: boolean;
  setAutoUnzipContent: (enabled: boolean) => void;
};

const AUTO_UNZIP_STORAGE_KEY = 'easy_publish:auto_unzip_content';

const ContentDisplayContext = createContext<ContentDisplayContextValue | undefined>(
  undefined
);

function readInitialAutoUnzipValue(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_UNZIP_STORAGE_KEY);
    if (saved === '0') return false;
    if (saved === '1') return true;
  } catch {
    // Ignore storage read failures and keep default.
  }
  return true;
}

export function ContentDisplayProvider({ children }: { children: React.ReactNode }) {
  const [autoUnzipContent, setAutoUnzipContentState] = useState<boolean>(
    readInitialAutoUnzipValue
  );

  const setAutoUnzipContent = useCallback((enabled: boolean) => {
    setAutoUnzipContentState(enabled);
    try {
      localStorage.setItem(AUTO_UNZIP_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  const value = useMemo<ContentDisplayContextValue>(
    () => ({ autoUnzipContent, setAutoUnzipContent }),
    [autoUnzipContent, setAutoUnzipContent]
  );

  return (
    <ContentDisplayContext.Provider value={value}>
      {children}
    </ContentDisplayContext.Provider>
  );
}

export function useContentDisplay(): ContentDisplayContextValue {
  const context = useContext(ContentDisplayContext);
  if (!context) {
    throw new Error('useContentDisplay must be used inside ContentDisplayProvider');
  }
  return context;
}
