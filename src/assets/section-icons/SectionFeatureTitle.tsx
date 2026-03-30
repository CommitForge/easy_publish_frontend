import type { ReactNode } from "react";
import type { IconType } from "react-icons";

type SectionFeatureTitleProps = {
  icon: IconType;
  children: ReactNode;
};

export function SectionFeatureTitle({
  icon: Icon,
  children,
}: SectionFeatureTitleProps) {
  return (
    <span className="section-feature-title">
      <span className="section-feature-icon" aria-hidden="true">
        <Icon />
      </span>
      <span>{children}</span>
    </span>
  );
}
