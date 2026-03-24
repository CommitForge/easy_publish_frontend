import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';
import { API_WS_BASE } from '../Config.ts';

export interface SyncStatus {
  lastSequenceIndex: number;
  lastSyncTs: string | null;
  nextSyncTs: string | null;
  lastSyncError: boolean;
  onchainLastDataItemIndex: number | null;
  onchainLastDataItemId: string | null;
}

/**
 * Custom hook for managing WebSocket sync status via STOMP.
 * Handles connection, reconnection, and sync status updates with splash animation.
 *
 * @returns Object containing syncStatus and splash state
 */
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [splash, setSplash] = useState(false);
  const lastSyncRef = useRef<string | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new WebSocket(`${API_WS_BASE}/ws-sync`),
      reconnectDelay: 5000,
      debug: (msg) => console.log('STOMP:', msg),
      onConnect: () => {
        client.subscribe('/topic/sync-status', (message: IMessage) => {
          if (!message.body) return;
          try {
            const data: SyncStatus = JSON.parse(message.body);

            // Trigger splash animation if sync timestamp changed
            if (lastSyncRef.current && lastSyncRef.current !== data.lastSyncTs) {
              setSplash(true);
              setTimeout(() => setSplash(false), 800);
            }

            lastSyncRef.current = data.lastSyncTs;
            setSyncStatus(data);
          } catch (err) {
            console.error('Failed to parse sync status:', err);
          }
        });
      },
      onStompError: (frame) => console.error('STOMP error', frame),
    });

    client.activate();

    return () => {
      client.deactivate().catch((err) =>
        console.error('Error during STOMP disconnect', err)
      );
    };
  }, []);

  return { syncStatus, splash };
}