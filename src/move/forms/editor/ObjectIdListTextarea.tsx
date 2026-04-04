import type { FocusEventHandler } from 'react';

type ObjectIdListTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
  helperText?: string;
  invalid?: boolean;
  className?: string;
};

export default function ObjectIdListTextarea({
  value,
  onChange,
  placeholder = '0x...',
  rows = 4,
  onBlur,
  helperText = 'Comma or new line separated IDs.',
  invalid = false,
  className = '',
}: ObjectIdListTextareaProps) {
  return (
    <>
      <textarea
        className={`form-control form-control-sm w-100 bp-object-id-textarea ${className} ${
          invalid ? 'is-invalid' : ''
        }`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {helperText ? <small className="muted d-block mt-1">{helperText}</small> : null}
    </>
  );
}
