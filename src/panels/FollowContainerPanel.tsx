import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../Config';
import {
  FOLLOW_CONTAINERS_CLEARED_EVENT,
  FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY,
  FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY,
  getFollowStorageItem,
  parseAddressList,
  removeFollowStorageItem,
  setFollowStorageItem,
  type FollowContainerUpdateEntry,
} from '../move/forms/FormUtils.tsx';
import ObjectIdListTextarea from '../move/forms/editor/ObjectIdListTextarea.tsx';
import './FollowContainerPanel.css';

interface FollowContainerPanelProps {
  accountAddress: string | undefined;
  followedContainers: string[];
  setFollowedContainers: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedContainerId: (id: string | null) => void;
  setPrimaryMenuSelection: (val: 'items' | 'addDataItem') => void;
}

export function FollowContainerPanel({
  accountAddress,
  followedContainers,
  setFollowedContainers,
  setSelectedContainerId,
  setPrimaryMenuSelection,
}: FollowContainerPanelProps) {
  const [showFollowPanel, setShowFollowPanel] = useState(false);
  const [showFollowed, setShowFollowed] = useState(false);
  const [followInput, setFollowInput] = useState('');
  const [followSearch, setFollowSearch] = useState('');
  const [followPage, setFollowPage] = useState(0);
  const [followTotalPages, setFollowTotalPages] = useState(0);
  const followPageSize = 10;
  const [followMessage, setFollowMessage] = useState('');
  const [followMessageColor, setFollowMessageColor] = useState('green');
  const [reloadFollowed, setReloadFollowed] = useState(0);
  const [validatingInput, setValidatingInput] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<FollowContainerUpdateEntry[]>(() => {
    const rawDraft = getFollowStorageItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
    if (!rawDraft) return [];
    try {
      const parsed = JSON.parse(rawDraft) as { entries?: FollowContainerUpdateEntry[] };
      return Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch (err) {
      console.warn('Failed to restore follow draft', err);
      return [];
    }
  });

  const refreshFollowed = () => setReloadFollowed((k) => k + 1);

  const showFollowStatus = (message: string, color: 'green' | 'red') => {
    setFollowMessage(message);
    setFollowMessageColor(color);
  };

  useEffect(() => {
    if (!accountAddress || !showFollowPanel || !showFollowed) return;

    axios
      .get(`${API_BASE}api/followed-containers`, {
        params: {
          userAddress: accountAddress,
          page: followPage,
          pageSize: followPageSize,
        },
      })
      .then((res) => {
        const data = res.data;
        const containers = Array.isArray(data?.content)
          ? data.content
              .map((c: { id?: unknown }) => c?.id)
              .filter((id: unknown): id is string => typeof id === 'string')
          : [];
        setFollowedContainers(containers);
        setFollowTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => {
        console.error(err);
        setFollowedContainers([]);
      });
  }, [
    accountAddress,
    followPage,
    setFollowedContainers,
    reloadFollowed,
    showFollowPanel,
    showFollowed,
  ]);

  const parseInputIds = (): string[] => parseAddressList(followInput);

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

  const queueUpdates = async (
    enabled: boolean,
    ids: string[],
    skipExistsCheck = false
  ) => {
    if (ids.length === 0) {
      showFollowStatus('Enter valid 0x... IDs.', 'red');
      return;
    }

    let idsToQueue = ids;
    let missingIds: string[] = [];

    if (!skipExistsCheck) {
      setValidatingInput(true);
      try {
        const validation = await filterExistingContainerIds(ids);
        idsToQueue = validation.existingIds;
        missingIds = validation.missingIds;
      } finally {
        setValidatingInput(false);
      }
    }

    if (idsToQueue.length === 0) {
      showFollowStatus(
        missingIds.length > 0
          ? `Not found: ${missingIds.join(', ')}`
          : 'No valid IDs to queue.',
        'red'
      );
      return;
    }

    setPendingUpdates((prev) => {
      const byContainer = new Map<string, boolean>(
        prev.map((entry) => [entry.container_id, entry.enabled])
      );
      idsToQueue.forEach((id) => byContainer.set(id, enabled));
      return Array.from(byContainer.entries()).map(([container_id, state]) => ({
        container_id,
        enabled: state,
      }));
    });

    if (!skipExistsCheck && missingIds.length > 0) {
      setFollowInput(missingIds.join('\n'));
      showFollowStatus(
        `Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}. Not found: ${missingIds.join(', ')}`,
        'red'
      );
      return;
    }

    setFollowInput('');
    showFollowStatus(`Queued ${idsToQueue.length} ${enabled ? 'follow' : 'unfollow'}.`, 'green');
  };

  const queueInputAsFollow = () => {
    void queueUpdates(true, parseInputIds());
  };
  const queueInputAsUnfollow = () => {
    void queueUpdates(false, parseInputIds());
  };

  useEffect(() => {
    if (pendingUpdates.length === 0) {
      removeFollowStorageItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
      return;
    }

    setFollowStorageItem(
      FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY,
      JSON.stringify({ entries: pendingUpdates })
    );
  }, [pendingUpdates]);

  useEffect(() => {
    const clearDraftOnUnload = () => {
      removeFollowStorageItem(FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY);
      removeFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY);
    };
    const clearDraftFromEvent = () => {
      setPendingUpdates([]);
      setFollowInput('');
      showFollowStatus('Pending updates cleared.', 'green');
    };

    window.addEventListener('beforeunload', clearDraftOnUnload);
    window.addEventListener(FOLLOW_CONTAINERS_CLEARED_EVENT, clearDraftFromEvent);
    return () => {
      window.removeEventListener('beforeunload', clearDraftOnUnload);
      window.removeEventListener(FOLLOW_CONTAINERS_CLEARED_EVENT, clearDraftFromEvent);
    };
  }, []);

  const openPublishFollowForm = () => {
    if (pendingUpdates.length === 0) {
      showFollowStatus('Queue at least one update first.', 'red');
      return;
    }

    setFollowStorageItem(
      FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY,
      JSON.stringify({ entries: pendingUpdates })
    );
    setFollowStorageItem(FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY, '1');
    setPrimaryMenuSelection('addDataItem');
    showFollowStatus('Draft ready in New Item form.', 'green');
  };

  const toggleViewFollowed = () => {
    const next = !showFollowed;
    setShowFollowed(next);
    if (next) {
      setFollowSearch('');
      setFollowPage(0);
      refreshFollowed();
    }
  };

  const filteredFollowed = followSearch.trim()
    ? followedContainers.filter((id) =>
        id.toLowerCase().includes(followSearch.trim().toLowerCase())
      )
    : followedContainers;

  const removePendingUpdate = (containerId: string) => {
    setPendingUpdates((prev) => prev.filter((entry) => entry.container_id !== containerId));
  };

  return (
    <div className="follow-panel-root">
      <div
        className="follow-panel-toggle"
        onClick={() => {
          setShowFollowPanel((v) => !v);
          refreshFollowed();
        }}
      >
        Follow Containers {showFollowPanel ? '▲' : '▼'}
      </div>

      {showFollowPanel && (
        <div className="follow-panel-body">
          <div className="follow-panel-input-row">
            <ObjectIdListTextarea
              className="follow-panel-input"
              placeholder="0x... IDs"
              rows={3}
              value={followInput}
              onChange={setFollowInput}
              helperText="Comma or new line separated IDs."
            />
          </div>

          <div className="follow-panel-actions">
            <button
              className="btn btn-sm btn-success flex-fill"
              onClick={queueInputAsFollow}
              disabled={validatingInput}
            >
              Follow
            </button>
            <button
              className="btn btn-sm btn-outline-warning flex-fill"
              onClick={queueInputAsUnfollow}
              disabled={validatingInput}
            >
              Unfollow
            </button>
          </div>

          {followMessage && (
            <div className="follow-panel-feedback" style={{ color: followMessageColor }}>
              {followMessage}
            </div>
          )}

          <div className="follow-panel-draft">
            <div className="follow-panel-list-header">
              <span>Pending</span>
            </div>
            {pendingUpdates.length > 0 ? (
              pendingUpdates.map((entry) => (
                <div key={entry.container_id} className="follow-panel-row">
                  <span className="follow-panel-row-link" title={entry.container_id}>
                    {entry.enabled ? 'Follow' : 'Unfollow'}: {entry.container_id}
                  </span>
                  <button
                    className="follow-panel-remove-btn"
                    title={`Remove ${entry.container_id}`}
                    onClick={() => removePendingUpdate(entry.container_id)}
                  >
                    X
                  </button>
                </div>
              ))
            ) : (
              <div className="follow-panel-empty">No queued updates.</div>
            )}
            <small className="muted d-block">Applies on publish.</small>
          </div>

          <div className="follow-panel-primary-buttons">
            <button className="btn btn-sm btn-outline-primary" onClick={openPublishFollowForm}>
              Open Input Form
            </button>

            <button className="btn btn-sm btn-outline-secondary" onClick={toggleViewFollowed}>
              {showFollowed ? 'Hide Followed' : 'View Followed'}
            </button>
          </div>

          {showFollowed && (
            <div className="follow-panel-list">
              <div className="follow-panel-list-header">
                <span>Followed Containers</span>
              </div>

              <input
                className="follow-panel-search"
                placeholder="Search..."
                value={followSearch}
                onChange={(e) => setFollowSearch(e.target.value)}
              />

              {filteredFollowed.length > 0 ? (
                filteredFollowed.map((id, i) => {
                  const displayId = id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
                  return (
                    <div key={`${id}-${i}`} className="follow-panel-row">
                      <span
                        className="follow-panel-row-link"
                        title={id}
                        onClick={() => {
                          setSelectedContainerId(id);
                          setPrimaryMenuSelection('items');
                        }}
                      >
                        {displayId}
                      </span>
                      <button
                        className="follow-panel-unfollow-inline-btn"
                        title={`Queue ${id} as unfollow`}
                        onClick={() => {
                          void queueUpdates(false, [id], true);
                        }}
                      >
                        X
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="follow-panel-empty">No followed containers on this page</div>
              )}

              {followTotalPages > 1 && (
                <div className="follow-panel-pagination">
                  <button
                    className="follow-panel-page-btn"
                    style={{
                      cursor: followPage === 0 ? 'default' : 'pointer',
                      opacity: followPage === 0 ? 0.4 : 1,
                    }}
                    onClick={() => setFollowPage((p) => Math.max(0, p - 1))}
                  >
                    ←
                  </button>
                  <span>
                    {followPage + 1}/{followTotalPages}
                  </span>
                  <button
                    className="follow-panel-page-btn"
                    style={{
                      cursor: followPage + 1 >= followTotalPages ? 'default' : 'pointer',
                      opacity: followPage + 1 >= followTotalPages ? 0.4 : 1,
                    }}
                    onClick={() =>
                      setFollowPage((p) => (p + 1 < followTotalPages ? p + 1 : p))
                    }
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
