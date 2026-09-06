import React from 'react';
import { useOffline } from '../../context/OfflineContext';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

export const OfflineBanner: React.FC = () => {
  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    pendingCount,
    isSyncing,
    triggerSync,
  } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between z-20 shrink-0 select-none">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
        <div>
          <span className="font-bold">
            {!isOnline ? 'Offline Mode Active:' : 'Pending Synchronization:'}
          </span>{' '}
          <span>
            {!isOnline
              ? 'Network connection interrupted. New sales are stored in the local outbox with "pending_sync_offline" status and are not authoritative server-committed.'
              : `${pendingCount} offline transaction(s) queued for synchronization.`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isSimulatedOffline && (
          <button
            type="button"
            onClick={toggleSimulatedOffline}
            className="text-[11px] underline hover:no-underline font-semibold text-amber-800 dark:text-amber-300 cursor-pointer"
          >
            End Simulation
          </button>
        )}

        {isOnline && pendingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerSync()}
            isLoading={isSyncing}
            leftIcon={<RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />}
            className="border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200"
          >
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
};
