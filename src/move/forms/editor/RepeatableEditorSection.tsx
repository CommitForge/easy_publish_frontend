import type { ReactNode } from 'react';

type RepeatableEditorSectionProps<T> = {
  items: T[];
  emptyMessage: string;
  addLabel?: string;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  getItemLabel?: (item: T, index: number) => ReactNode;
  renderItemBody: (item: T, index: number) => ReactNode;
  className?: string;
};

export default function RepeatableEditorSection<T>({
  items,
  emptyMessage,
  addLabel,
  onAdd,
  onRemove,
  getItemLabel,
  renderItemBody,
  className,
}: RepeatableEditorSectionProps<T>) {
  return (
    <div className={className}>
      {items.length === 0 ? (
        <small className="muted d-block mb-2">{emptyMessage}</small>
      ) : (
        items.map((item, index) => {
          const itemBody = renderItemBody(item, index);
          return (
            <div key={index} className="bp-repeatable-editor-item">
              <div className="bp-repeatable-editor-item-head">
                <strong className="bp-repeatable-editor-item-label">
                  {getItemLabel ? getItemLabel(item, index) : `Entry #${index + 1}`}
                </strong>
                {onRemove ? (
                  <button
                    type="button"
                    className="bp-inline-action-link is-danger"
                    onClick={() => onRemove(index)}
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" />
                    Remove
                  </button>
                ) : null}
              </div>
              {itemBody ? (
                <div className="bp-repeatable-editor-item-body">{itemBody}</div>
              ) : null}
            </div>
          );
        })
      )}

      {onAdd && addLabel ? (
        <button
          type="button"
          className="bp-inline-action-link"
          onClick={onAdd}
        >
          <i className="bi bi-plus-circle" aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
