import React from 'react';

/* ============================================================
   Generic vertical-aligned form row
   Label ends at same column for all fields
   ============================================================ */

export type FormRowProps = {
  label: string;
  children: React.ReactNode;
};

export const FormRow: React.FC<FormRowProps> = ({ label, children }) => (
  <div className="row align-items-center mb-3">
    <label className="col-4 col-form-label text-end">
      {label}
    </label>
    <div className="col-8">
      {children}
    </div>
  </div>
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
