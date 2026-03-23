import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../Config';
import './FollowContainerPanel.css';

interface FollowContainerPanelProps {
  accountAddress: string | undefined;
  followedContainers: string[];
  setFollowedContainers: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedContainerId: (id: string | null) => void;
  setPrimaryMenuSelection: (val: 'items') => void;
}

export function FollowContainerPanel({
  accountAddress,
  followedContainers,
  setFollowedContainers,
  setSelectedContainerId,
  setPrimaryMenuSelection,
}: FollowContainerPanelProps) {
  const [showFollowPanel, setShowFollowPanel] = useState(false);
  const [followInput, setFollowInput] = useState('');
  const [followPage, setFollowPage] = useState(0);
  const [followTotalPages, setFollowTotalPages] = useState(0);
  const followPageSize = 10;
  const [followMessage, setFollowMessage] = useState('');
  const [followMessageColor, setFollowMessageColor] = useState('green');
  const [reloadFollowed, setReloadFollowed] = useState(0); // key to trigger reload

  const refreshFollowed = () => setReloadFollowed((k) => k + 1);

  const showFollowStatus = (message: string, color: 'green' | 'red') => {
    setFollowMessage(message);
    setFollowMessageColor(color);
  };

  /* ---------------- load followed containers ---------------- */
  useEffect(() => {
    if (!accountAddress) return;

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
        const containers = data?.content?.map((c: any) => c.id) ?? [];
        setFollowedContainers(containers);
        setFollowTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => {
        console.error(err);
        setFollowedContainers([]);
      });
  }, [accountAddress, followPage, setFollowedContainers, reloadFollowed]);

  /* ---------------- follow container ---------------- */
  const addFollowedContainer = async () => {
    if (!followInput || !accountAddress) return;

    const ids = followInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    try {
      const res = await axios.post(
        `${API_BASE}api/follow-container`,
        null,
        { params: { userAddress: accountAddress, containerIds: ids } }
      );
      const data = res.data;
      showFollowStatus(`Added: ${data.added}, Skipped: ${data.skipped}`, 'green');
      setFollowInput('');
      refreshFollowed();
    } catch (err) {
      showFollowStatus('Error following container(s)', 'red');
      console.error(err);
    }
  };

  const removeFollowedContainer = async (id: string) => {
    if (!accountAddress) return;
    try {
      await axios.delete(`${API_BASE}api/follow-container`, {
        params: { userAddress: accountAddress, containerId: id },
      });
      refreshFollowed();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFollowedContainers = async () => {
    if (!accountAddress) return;
    if (!confirm('Are you sure you want to unfollow all containers?')) return;
    try {
      await axios.delete(`${API_BASE}api/follow-containers`, {
        params: { userAddress: accountAddress },
      });
      refreshFollowed();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="follow-panel-root">
      {/* Toggle panel */}
      <div
        className="follow-panel-toggle"
        onClick={() => setShowFollowPanel(v => !v)}
      >
        🔗 Follow Containers {showFollowPanel ? '▲' : '▼'}
      </div>

      {showFollowPanel && (
        <div className="follow-panel-body">
          {/* Input + Add */}
          <textarea
            className="follow-panel-input"
            placeholder="0x... Container IDs (comma or newline separated)"
            value={followInput}
            onChange={(e) => setFollowInput(e.target.value)}
          />
          <button
            className="btn follow-panel-add-btn"
            onClick={addFollowedContainer}
          >
            Add
          </button>

          {/* Feedback */}
          {followMessage && (
            <div className="follow-panel-feedback" style={{ color: followMessageColor }}>
              {followMessage}
            </div>
          )}
          <span className="follow-panel-experimental">* Experimental feature *</span>

          {/* Followed containers list */}
          <div className="follow-panel-list">
            <div className="follow-panel-list-header">
              <span>Followed Containers</span>
              {followedContainers.length > 0 && (
                <button
                  className="follow-panel-clear-btn"
                  onClick={clearFollowedContainers}
                >
                  Clear All
                </button>
              )}
            </div>

            {followedContainers.length > 0 ? (
              followedContainers.map((id, i) => {
                const displayId = id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
                return (
                  <div
                    key={`${id}-${i}`}
                    className="follow-panel-row"
                  >
                    <span
                      className="follow-panel-row-link"
                      title={id}
                      onClick={() => {
                        setSelectedContainerId(id);
                        setPrimaryMenuSelection('items');
                      }}
                    >
                      🔗 {displayId}
                    </span>
                    <span
                      className="follow-panel-row-remove"
                      onClick={() => removeFollowedContainer(id)}
                    >
                      ✕
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="follow-panel-empty">
                No followed containers
              </div>
            )}

            {/* Pagination */}
            {followTotalPages > 1 && (
              <div className="follow-panel-pagination">
                <button
                  className="follow-panel-page-btn"
                  style={{ cursor: followPage === 0 ? 'default' : 'pointer', opacity: followPage === 0 ? 0.4 : 1 }}
                  onClick={() => setFollowPage(p => Math.max(0, p - 1))}
                >
                  ←
                </button>
                <span>{followPage + 1}/{followTotalPages}</span>
                <button
                  className="follow-panel-page-btn"
                  style={{
                    cursor: followPage + 1 >= followTotalPages ? 'default' : 'pointer',
                    opacity: followPage + 1 >= followTotalPages ? 0.4 : 1,
                  }}
                  onClick={() => setFollowPage(p => (p + 1 < followTotalPages ? p + 1 : p))}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
