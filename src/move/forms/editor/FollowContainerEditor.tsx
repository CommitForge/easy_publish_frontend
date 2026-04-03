import { useEffect, useState } from 'react';
import { API_BASE } from '../../../Config.ts';
import {
  extractFollowContainersFromContent,
  mergeContentWithFollowContainers,
  OBJECT_ID_REGEX,
  type FollowContainerUpdateEntry,
} from '../FormUtils.tsx';

interface FollowContainerEditorProps {
  value: string;
  onChange: (json: string) => void;
}

export default function FollowContainerEditor({
  value,
  onChange,
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

  const parseInputIds = (): string[] =>
    containerInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((id) => OBJECT_ID_REGEX.test(id));

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
      setContainerInput(missingIds.join(','));
      showStatus(
        `Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}. Not found: ${missingIds.join(', ')}`,
        'red'
      );
      return;
    }

    setContainerInput('');
    showStatus(`Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}.`, 'green');
  };

  const removeEntry = (containerId: string) => {
    persist(entries.filter((entry) => entry.container_id !== containerId));
  };

  return (
    <div>
      <div className="mb-2">
        <input
          className="form-control form-control-sm"
          placeholder="0x... IDs"
          value={containerInput}
          onChange={(e) => setContainerInput(e.target.value)}
        />
      </div>

      <div className="d-flex flex-nowrap gap-2 mb-2">
        <button
          className="btn btn-sm btn-success w-50"
          onClick={() => {
            void queueUpdates(true);
          }}
          disabled={validatingInput}
        >
          Follow
        </button>
        <button
          className="btn btn-sm btn-outline-warning w-50"
          onClick={() => {
            void queueUpdates(false);
          }}
          disabled={validatingInput}
        >
          Unfollow
        </button>
      </div>

      {feedback && (
        <small className="d-block mb-2" style={{ color: feedbackColor }}>
          {feedback}
        </small>
      )}

      <div className="mb-1 fw-semibold">Pending</div>
      {entries.length > 0 ? (
        entries.map((entry, index) => (
          <div
            key={`${entry.container_id}-${index}`}
            className="mb-1 p-2 border rounded d-flex justify-content-between align-items-start gap-2"
          >
            <div className="small text-break">
              {entry.enabled ? 'Follow' : 'Unfollow'}: {entry.container_id}
            </div>
            <button
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => removeEntry(entry.container_id)}
              title={`Remove ${entry.container_id}`}
            >
              X
            </button>
          </div>
        ))
      ) : (
        <small className="muted d-block mb-2">No queued updates.</small>
      )}

      <small className="muted d-block mt-2">
        Stored in <code>easy_publish.follow_containers</code>. Applies on publish.
      </small>
    </div>
  );
}
