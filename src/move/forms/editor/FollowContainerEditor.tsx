import { type FocusEvent, useEffect, useState } from 'react';
import { API_BASE } from '../../../Config.ts';
import {
  extractFollowContainersFromContent,
  mergeContentWithFollowContainers,
  parseAddressList,
  type FollowContainerUpdateEntry,
} from '../FormUtils.tsx';
import RepeatableEditorSection from './RepeatableEditorSection.tsx';
import ObjectIdListTextarea from './ObjectIdListTextarea.tsx';

interface FollowContainerEditorProps {
  value: string;
  onChange: (json: string) => void;
  onBlur?: () => void;
}

export default function FollowContainerEditor({
  value,
  onChange,
  onBlur,
}: FollowContainerEditorProps) {
  const [entries, setEntries] = useState<FollowContainerUpdateEntry[]>([]);
  const [containerInput, setContainerInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState<'green' | 'red'>('green');
  const [validatingInput, setValidatingInput] = useState(false);

  useEffect(() => {
    setEntries(extractFollowContainersFromContent(value));
  }, [value]);

  const persist = (nextEntries: FollowContainerUpdateEntry[]) => {
    setEntries(nextEntries);
    onChange(mergeContentWithFollowContainers(value, nextEntries));
  };

  const parseInputIds = (): string[] => parseAddressList(containerInput);

  const showStatus = (message: string, color: 'green' | 'red') => {
    setFeedback(message);
    setFeedbackColor(color);
  };

  const filterExistingContainerIds = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    const checks = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE}api/containers/${id}`);
          return { id, exists: res.ok };
        } catch {
          return { id, exists: false };
        }
      })
    );

    return {
      existingIds: checks.filter((entry) => entry.exists).map((entry) => entry.id),
      missingIds: checks.filter((entry) => !entry.exists).map((entry) => entry.id),
    };
  };

  const queueUpdates = async (enabled: boolean) => {
    const ids = parseInputIds();
    if (ids.length === 0) {
      showStatus('Enter valid 0x... IDs.', 'red');
      return;
    }

    setValidatingInput(true);
    let idsToQueue: string[] = [];
    let missingIds: string[] = [];
    try {
      const validation = await filterExistingContainerIds(ids);
      idsToQueue = validation.existingIds;
      missingIds = validation.missingIds;
    } finally {
      setValidatingInput(false);
    }

    if (idsToQueue.length === 0) {
      showStatus(
        missingIds.length > 0
          ? `Not found: ${missingIds.join(', ')}`
          : 'No valid IDs to queue.',
        'red'
      );
      return;
    }

    const byContainer = new Map<string, boolean>(
      entries.map((entry) => [entry.container_id, entry.enabled])
    );
    idsToQueue.forEach((id) => byContainer.set(id, enabled));

    const next = Array.from(byContainer.entries()).map(([container_id, state]) => ({
      container_id,
      enabled: state,
    }));
    persist(next);

    if (missingIds.length > 0) {
      setContainerInput(missingIds.join('\n'));
      showStatus(
        `Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}. Not found: ${missingIds.join(', ')}`,
        'red'
      );
      return;
    }

    setContainerInput('');
    showStatus(`Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}.`, 'green');
  };

  const removeEntry = (index: number) => {
    persist(entries.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!onBlur) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    onBlur();
  };

  return (
    <div onBlurCapture={handleBlurCapture}>
      <div className="mb-2">
        <ObjectIdListTextarea
          value={containerInput}
          onChange={setContainerInput}
          placeholder="0x... IDs"
          rows={4}
        />
      </div>

      <div className="bp-inline-action-row mb-2">
        <button
          type="button"
          className="bp-inline-action-link is-success"
          onClick={() => {
            void queueUpdates(true);
          }}
          disabled={validatingInput}
        >
          <i className="bi bi-plus-circle" aria-hidden="true" />
          Follow
        </button>
        <button
          type="button"
          className="bp-inline-action-link is-warning"
          onClick={() => {
            void queueUpdates(false);
          }}
          disabled={validatingInput}
        >
          <i className="bi bi-dash-circle" aria-hidden="true" />
          Unfollow
        </button>
      </div>

      {feedback && (
        <small className="d-block mb-2" style={{ color: feedbackColor }}>
          {feedback}
        </small>
      )}

      <div className="mb-1 fw-semibold">Pending</div>
      <RepeatableEditorSection
        items={entries}
        emptyMessage="No queued updates."
        onRemove={removeEntry}
        getItemLabel={(entry) => (
          <span className="text-break">
            {entry.enabled ? 'Follow' : 'Unfollow'}: {entry.container_id}
          </span>
        )}
        renderItemBody={() => null}
      />

      <small className="muted d-block mt-2">
        Stored in <code>easy_publish.follow_containers</code>. Applies on publish.
      </small>
    </div>
  );
}
