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
      showStatus('Please enter valid 0x... container IDs.', 'red');
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
          ? `Container not found: ${missingIds.join(', ')}`
          : 'No valid container IDs to queue.',
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
        `Queued ${idsToQueue.length} update(s) as ${
          enabled ? 'follow' : 'unfollow'
        }. Invalid ID(s): ${missingIds.join(', ')}`,
        'red'
      );
      return;
    }

    setContainerInput('');
    showStatus(
      `Queued ${idsToQueue.length} update(s) as ${
        enabled ? 'follow' : 'unfollow'
      }. Publish this item to apply.`,
      'green'
    );
  };

  return (
    <div>
      <div className="mb-2">
        <input
          className="form-control form-control-sm"
          placeholder="0x... IDs (comma/newline)"
          value={containerInput}
          onChange={(e) => setContainerInput(e.target.value)}
        />
      </div>

      <div className="d-flex gap-2 mb-2">
        <button
          className="btn btn-sm btn-outline-primary flex-fill"
          onClick={() => {
            void queueUpdates(true);
          }}
          disabled={validatingInput}
        >
          Follow
        </button>
        <button
          className="btn btn-sm btn-outline-warning flex-fill"
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

      <div className="mb-1 fw-semibold">Pending Follow Updates</div>
      {entries.length > 0 ? (
        entries.map((entry, index) => (
          <div key={`${entry.container_id}-${index}`} className="mb-1 p-2 border rounded">
            <div className="small">
              {entry.enabled ? 'Follow' : 'Unfollow'}: {entry.container_id}
            </div>
          </div>
        ))
      ) : (
        <small className="muted d-block mb-2">No queued updates.</small>
      )}

      <small className="muted d-block mt-2">
        Stored in <code>easy_publish.follow_containers</code>. Submit a new data item to
        apply follow/unfollow updates.
      </small>
    </div>
  );
}
