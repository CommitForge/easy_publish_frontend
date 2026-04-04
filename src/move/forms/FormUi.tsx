import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../Config.ts';

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

export type FormNoticeTone = 'danger' | 'success' | 'info';

export type FormNotice = {
  message: string;
  tone?: FormNoticeTone;
};

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
      return { message: t('messages.contentCheckJsonInvalid'), tone: 'danger' };
    }
  }

  if (startsWith === '<' || (xmlLikely && !jsonLikely)) {
    const validXml = isValidXml(trimmed);
    return {
      message: validXml
        ? t('messages.contentCheckXmlValid')
        : t('messages.contentCheckXmlInvalid'),
      tone: validXml ? 'success' : 'danger',
    };
  }

  return { message: t('messages.contentCheckPlainText'), tone: 'info' };
}

type ContentCheckInlineProps = {
  content: string;
  autoCheckSignal?: number;
  rightControl?: React.ReactNode;
};

export const ContentCheckInline: React.FC<ContentCheckInlineProps> = ({
  content,
  autoCheckSignal,
  rightControl,
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
      <button
        type="button"
        className="form-content-check-trigger"
        onClick={runCheck}
        aria-busy={isChecking}
      >
        <i className="bi bi-check2-circle" aria-hidden="true" />
        {t('actions.checkContent')}
      </button>
      <span
        className="form-content-check-help"
        title={t('messages.contentCheckHelp')}
        aria-label={t('labels.contentCheckHelp')}
      >
        <i className="bi bi-info-circle" aria-hidden="true" />
      </span>
      {rightControl ? (
        <span className="form-content-check-right-control">{rightControl}</span>
      ) : null}
      {result ? (
        <small className={`form-content-check-result text-${result.tone}`}>
          {result.message}
        </small>
      ) : null}
    </div>
  );
};

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
    <span
      className="form-content-check-help"
      title={t('messages.autoCompressHelp')}
      aria-label={t('labels.autoCompressHelp')}
    >
      <i className="bi bi-info-circle" aria-hidden="true" />
    </span>
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
    <span
      className="form-content-check-help"
      title={t('messages.autoZipHelp')}
      aria-label={t('labels.autoZipHelp')}
    >
      <i className="bi bi-info-circle" aria-hidden="true" />
    </span>
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
