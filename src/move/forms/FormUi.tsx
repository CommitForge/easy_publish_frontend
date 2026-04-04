import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../Config.ts';
import { prepareContentForPublish } from './ContentCompaction.ts';

/* ============================================================
   Generic vertical-aligned form row
   Label ends at same column for all fields
   ============================================================ */

export type FormRowProps = {
  label: string;
  children: React.ReactNode;
};

export const FormRow: React.FC<FormRowProps> = ({ label, children }) => (
  <div className="row g-1 g-sm-2 align-items-start mb-3 bp-form-row">
    <label className="col-12 col-sm-4 col-form-label text-start text-sm-end bp-form-row-label">
      {label}
    </label>
    <div className="col-12 col-sm-8 bp-form-row-input">
      {children}
    </div>
  </div>
);

export type FormNoticeTone = 'danger' | 'success' | 'info' | 'warning';

export type FormNotice = {
  message: string;
  tone?: FormNoticeTone;
};

const AUTO_COMPRESS_SESSION_KEY = 'easy_publish:auto_compress';
const AUTO_ZIP_SESSION_KEY = 'easy_publish:auto_zip';

function readSessionBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // Ignore storage issues and use fallback.
  }
  return fallback;
}

type SessionContentPublishOptions = {
  autoCompressContent: boolean;
  setAutoCompressContent: (enabled: boolean) => void;
  autoZipContent: boolean;
  setAutoZipContent: (enabled: boolean) => void;
};

export function useSessionContentPublishOptions(): SessionContentPublishOptions {
  const [autoCompressContentState, setAutoCompressContentState] = useState<boolean>(
    () => readSessionBoolean(AUTO_COMPRESS_SESSION_KEY, true)
  );
  const [autoZipContentState, setAutoZipContentState] = useState<boolean>(() =>
    readSessionBoolean(AUTO_ZIP_SESSION_KEY, false)
  );

  const setAutoCompressContent = useCallback((enabled: boolean) => {
    setAutoCompressContentState(enabled);
    try {
      window.sessionStorage.setItem(AUTO_COMPRESS_SESSION_KEY, enabled ? '1' : '0');
    } catch {
      // Ignore storage write issues.
    }
  }, []);

  const setAutoZipContent = useCallback((enabled: boolean) => {
    setAutoZipContentState(enabled);
    try {
      window.sessionStorage.setItem(AUTO_ZIP_SESSION_KEY, enabled ? '1' : '0');
    } catch {
      // Ignore storage write issues.
    }
  }, []);

  return {
    autoCompressContent: autoCompressContentState,
    setAutoCompressContent,
    autoZipContent: autoZipContentState,
    setAutoZipContent,
  };
}

export function useTimedFormNotice(autoHideMs = 15000) {
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const timerRef = useRef<number | null>(null);
  const tokenRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearNotice = useCallback(() => {
    tokenRef.current += 1;
    clearTimer();
    setNotice(null);
  }, [clearTimer]);

  const showNotice = useCallback(
    (message: string, tone: FormNoticeTone = 'danger') => {
      const token = tokenRef.current + 1;
      tokenRef.current = token;
      clearTimer();
      setNotice({ message, tone });

      timerRef.current = window.setTimeout(() => {
        if (tokenRef.current === token) {
          setNotice(null);
          timerRef.current = null;
        }
      }, autoHideMs);
    },
    [autoHideMs, clearTimer]
  );

  useEffect(
    () => () => {
      clearTimer();
    },
    [clearTimer]
  );

  return { notice, showNotice, clearNotice };
}

type FormInlineNoticeProps = {
  notice: FormNotice | null;
};

export const FormInlineNotice: React.FC<FormInlineNoticeProps> = ({ notice }) =>
  notice ? (
    <small className={`form-inline-note text-${notice.tone ?? 'danger'}`}>
      {notice.message}
    </small>
  ) : null;

type InfoTooltipProps = {
  message: string;
  ariaLabel?: string;
  className?: string;
};

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  message,
  ariaLabel,
  className = '',
}) => (
  <span
    className={`form-content-help-tooltip ${className}`.trim()}
    tabIndex={0}
    aria-label={ariaLabel ?? message}
  >
    <i className="bi bi-info-circle" aria-hidden="true" />
    <span className="form-content-help-tooltip-bubble">{message}</span>
  </span>
);

type ContentCheckResult = {
  message: string;
  tone: FormNoticeTone;
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

function isValidXml(content: string): boolean {
  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(content, 'application/xml');
    return parsed.getElementsByTagName('parsererror').length === 0;
  } catch {
    return false;
  }
}

function detectContentCheckResult(content: string): ContentCheckResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { message: t('messages.contentCheckPlainText'), tone: 'info' };
  }

  const jsonLikely = isLikelyJson(trimmed);
  const xmlLikely = isLikelyXml(trimmed);
  const startsWith = trimmed[0] ?? '';

  if (startsWith === '{' || startsWith === '[' || (jsonLikely && !xmlLikely)) {
    try {
      JSON.parse(trimmed);
      return { message: t('messages.contentCheckJsonValid'), tone: 'success' };
    } catch {
      return { message: t('messages.contentCheckJsonInvalid'), tone: 'warning' };
    }
  }

  if (startsWith === '<' || (xmlLikely && !jsonLikely)) {
    const validXml = isValidXml(trimmed);
    return {
      message: validXml
        ? t('messages.contentCheckXmlValid')
        : t('messages.contentCheckXmlInvalid'),
      tone: validXml ? 'success' : 'warning',
    };
  }

  return { message: t('messages.contentCheckPlainText'), tone: 'info' };
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (next, [key, value]) => next.replaceAll(`{${key}}`, String(value)),
    template
  );
}

type ContentCheckInlineProps = {
  content: string;
  autoCheckSignal?: number;
  rightControl?: React.ReactNode;
  extraNotice?: React.ReactNode;
};

export const ContentCheckInline: React.FC<ContentCheckInlineProps> = ({
  content,
  autoCheckSignal,
  rightControl,
  extraNotice,
}) => {
  const [result, setResult] = useState<ContentCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);
  const runTokenRef = useRef(0);
  const lastAutoCheckSignalRef = useRef<number | undefined>(autoCheckSignal);

  const runCheck = useCallback(() => {
    if (isCheckingRef.current) {
      setResult({ message: t('messages.contentCheckAlreadyRunning'), tone: 'info' });
      return;
    }

    isCheckingRef.current = true;
    setIsChecking(true);
    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;
    const contentSnapshot = content;

    window.setTimeout(() => {
      if (runTokenRef.current !== runToken) return;

      setResult(detectContentCheckResult(contentSnapshot));
      isCheckingRef.current = false;
      setIsChecking(false);
    }, 0);
  }, [content]);

  useEffect(() => {
    runTokenRef.current += 1;
    isCheckingRef.current = false;
    setIsChecking(false);
    setResult(null);
  }, [content]);

  useEffect(() => {
    if (autoCheckSignal === undefined) return;
    if (lastAutoCheckSignalRef.current === undefined) {
      lastAutoCheckSignalRef.current = autoCheckSignal;
      return;
    }

    if (lastAutoCheckSignalRef.current !== autoCheckSignal) {
      lastAutoCheckSignalRef.current = autoCheckSignal;
      runCheck();
    }
  }, [autoCheckSignal, runCheck]);

  return (
    <div className="form-content-check-inline">
      <div className="form-content-check-controls form-content-check-controls-primary">
        <button
          type="button"
          className="form-content-check-trigger"
          onClick={runCheck}
          aria-busy={isChecking}
        >
          <i className="bi bi-check2-circle" aria-hidden="true" />
          {t('actions.checkContent')}
        </button>
        <InfoTooltip
          className="form-content-check-help"
          message={t('messages.contentCheckHelp')}
          ariaLabel={t('labels.contentCheckHelp')}
        />
      </div>
      {rightControl ? (
        <div className="form-content-check-controls form-content-check-controls-secondary">
          <span className="form-content-check-right-control">{rightControl}</span>
        </div>
      ) : null}
      {result ? (
        <small className={`form-content-check-result text-${result.tone}`}>
          {result.message}
        </small>
      ) : null}
      {extraNotice ? <div className="form-content-check-extra">{extraNotice}</div> : null}
    </div>
  );
};

type ContentPreviewButtonProps = {
  content: string;
  autoCompressEnabled: boolean;
  autoZipEnabled: boolean;
};

export const ContentPreviewButton: React.FC<ContentPreviewButtonProps> = ({
  content,
  autoCompressEnabled,
  autoZipEnabled,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewMeta, setPreviewMeta] = useState('');

  const openPreview = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const prepared = await prepareContentForPublish(content, {
        autoCompressEnabled,
        autoZipEnabled,
      });

      if (autoZipEnabled && !prepared.zipSupported) {
        setError(t('messages.autoZipUnsupported'));
        setPreviewContent(content);
        setPreviewMeta('');
        return;
      }

      setPreviewContent(prepared.content);
      const details = [
        `${t('labels.previewFormat')}: ${prepared.format.toUpperCase()}`,
        `${t('labels.previewLength')}: ${prepared.content.length}`,
        `${t('labels.previewCompacted')}: ${
          prepared.compacted ? t('labels.previewYes') : t('labels.previewNo')
        }`,
        `${t('labels.previewZipped')}: ${
          prepared.zipped ? t('labels.previewYes') : t('labels.previewNo')
        }`,
      ];
      setPreviewMeta(details.join(' | '));
    } catch {
      setError(t('messages.previewPrepareFailed'));
      setPreviewContent(content);
      setPreviewMeta('');
    } finally {
      setLoading(false);
    }
  }, [autoCompressEnabled, autoZipEnabled, content]);

  return (
    <>
      <button type="button" className="form-content-check-trigger" onClick={openPreview}>
        <i className="bi bi-eye" aria-hidden="true" />
        {t('actions.preview')}
      </button>
      {open ? (
        <div className="bp-dialog-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="bp-dialog bp-dialog-content-preview"
            role="dialog"
            aria-modal="true"
            aria-label={t('labels.previewSubmission')}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bp-dialog-close"
              aria-label={t('actions.close')}
              onClick={() => setOpen(false)}
            >
              <i className="bi bi-x-lg" />
            </button>

            <div className="form-content-preview-header">
              <h3 className="form-content-preview-title">{t('labels.previewSubmission')}</h3>
              {previewMeta ? (
                <small className="form-content-preview-meta">{previewMeta}</small>
              ) : null}
            </div>

            {loading ? (
              <div className="form-content-preview-loading">{t('actions.loading')}</div>
            ) : (
              <>
                {error ? (
                  <small className="form-content-preview-error text-danger">{error}</small>
                ) : null}
                <textarea
                  readOnly
                  className="form-control form-control-sm form-content-preview-textarea"
                  rows={16}
                  value={previewContent}
                />
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

type ContentZipSavingsNoticeProps = {
  content: string;
  autoCompressEnabled: boolean;
  autoZipEnabled: boolean;
};

export const ContentZipSavingsNotice: React.FC<ContentZipSavingsNoticeProps> = ({
  content,
  autoCompressEnabled,
  autoZipEnabled,
}) => {
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;

    if (!autoZipEnabled) {
      setNotice(null);
      return;
    }

    void (async () => {
      try {
        const plain = await prepareContentForPublish(content, {
          autoCompressEnabled,
          autoZipEnabled: false,
        });
        const zipped = await prepareContentForPublish(content, {
          autoCompressEnabled,
          autoZipEnabled: true,
        });

        if (tokenRef.current !== token) return;

        if (!zipped.zipSupported) {
          setNotice({ message: t('messages.autoZipUnsupported'), tone: 'warning' });
          return;
        }

        const plainLength = plain.content.length;
        const zippedLength = zipped.content.length;
        const savedChars = plainLength - zippedLength;
        const savedPercent =
          plainLength > 0 ? ((savedChars / plainLength) * 100).toFixed(1) : '0.0';

        if (savedChars > 0) {
          setNotice({
            message: interpolateTemplate(t('messages.autoZipSavingsPositive'), {
              saved: savedChars,
              percent: savedPercent,
            }),
            tone: 'success',
          });
          return;
        }

        setNotice({
          message: interpolateTemplate(t('messages.autoZipSavingsNegative'), {
            delta: Math.abs(savedChars),
            percent: Math.abs(Number(savedPercent)).toFixed(1),
          }),
          tone: 'warning',
        });
      } catch {
        if (tokenRef.current !== token) return;
        setNotice({ message: t('messages.autoZipEncodeFailed'), tone: 'danger' });
      }
    })();
  }, [autoCompressEnabled, autoZipEnabled, content]);

  return notice ? (
    <small className={`form-content-check-result text-${notice.tone ?? 'info'}`}>
      {notice.message}
    </small>
  ) : null;
};

type ContentPublishOptionsInlineProps = {
  content: string;
  autoCompressEnabled: boolean;
  onAutoCompressChange: (enabled: boolean) => void;
  autoZipEnabled: boolean;
  onAutoZipChange: (enabled: boolean) => void;
};

export const ContentPublishOptionsInline: React.FC<ContentPublishOptionsInlineProps> = ({
  content,
  autoCompressEnabled,
  onAutoCompressChange,
  autoZipEnabled,
  onAutoZipChange,
}) => (
  <>
    <ContentAutoCompressToggle
      enabled={autoCompressEnabled}
      onChange={onAutoCompressChange}
    />
    <ContentAutoZipToggle enabled={autoZipEnabled} onChange={onAutoZipChange} />
    <ContentPreviewButton
      content={content}
      autoCompressEnabled={autoCompressEnabled}
      autoZipEnabled={autoZipEnabled}
    />
  </>
);

type ContentAutoCompressToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export const ContentAutoCompressToggle: React.FC<ContentAutoCompressToggleProps> = ({
  enabled,
  onChange,
}) => (
  <span className="form-content-compress-control">
    <label className="form-content-compress-toggle">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t('actions.autoCompress')}
    </label>
    <InfoTooltip
      className="form-content-check-help"
      message={t('messages.autoCompressHelp')}
      ariaLabel={t('labels.autoCompressHelp')}
    />
  </span>
);

type ContentAutoZipToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export const ContentAutoZipToggle: React.FC<ContentAutoZipToggleProps> = ({
  enabled,
  onChange,
}) => (
  <span className="form-content-compress-control">
    <label className="form-content-compress-toggle">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t('actions.autoZip')}
    </label>
    <InfoTooltip
      className="form-content-check-help"
      message={t('messages.autoZipHelp')}
      ariaLabel={t('labels.autoZipHelp')}
    />
  </span>
);

/* ============================================================
   Checkbox section (Permissions, Events, Flags, etc.)
   PURE renderer — title handled by parent
   ============================================================ */

type CheckboxSectionProps<T> = {
  form: T;
  toggle: (key: keyof T) => void;
  items: [keyof T, string][];
};

export function CheckboxSection<T extends Record<string, any>>({
  items,
  form,
  toggle,
}: CheckboxSectionProps<T>) {
  return (
    <div className="row">
      <div className="col-8 offset-4">
        {items.map(([key, label]) => (
          <div className="form-check mb-2" key={String(key)}>
            <input
              className="form-check-input"
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={() => toggle(key)}
            />
            <label className="form-check-label">
              {label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Small helper inputs (fully typed for forms)
   ============================================================ */

export type TextInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    value: string | number;
    onChange: (value: string) => void;
  };

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  ...props
}) => {
  return (
    <input
      {...props}
      value={value}
      className={`form-control form-control-sm rounded-3 ${props.className ?? ''}`}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export type TextAreaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    value: string;
    onChange: (value: string) => void;
  };

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  ...props
}) => {
  return (
    <textarea
      {...props}
      value={value}
      className={`form-control form-control-sm rounded-3 ${props.className ?? ''}`}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

/* ============================================================
   Optional: Number input helper
   ============================================================ */

export type NumberInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    value: number;
    onChange: (value: number) => void;
  };

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  ...props
}) => {
  return (
    <input
      {...props}
      type="number"
      value={value}
      className={`form-control form-control-sm rounded-3 ${props.className ?? ''}`}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
};

/* ============================================================
   Form section wrapper (non-collapsible)
   ============================================================ */

type FormSectionProps = {
  title: string;
  children: React.ReactNode;
};

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
}) => (
  <div className="card p-3 mb-4">
    <h5 className="mb-3">{title}</h5>
    {children}
  </div>
);
