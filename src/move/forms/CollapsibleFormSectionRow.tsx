import { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

type FormSectionRowProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean; // ✅ new
};

export function FormSectionRow({
  title,
  description,
  children,
  defaultCollapsed = false, // ✅ default to collapsed if prop true
}: FormSectionRowProps) {
  const [open, setOpen] = useState(!defaultCollapsed); // respect prop

  return (
    <div className="form-section-row">
      {/* LEFT: label + toggle */}
      <div
        className="form-section-left"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <FaChevronDown /> : <FaChevronRight />}
        <span>{title}</span>
      </div>

      {/* MIDDLE: fields (stack vertically) */}
      <div className="form-section-middle">{open && children}</div>

      {/* RIGHT: help / description */}
      <div className={`form-section-right`}>
        {description}
      </div>
    </div>
  );
}
