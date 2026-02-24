import './SaveStatus.css';

type SaveStatus = 'saving' | 'saved' | 'error' | 'idle';

interface SaveStatusProps {
  status: SaveStatus;
  lastSaved?: Date;
}

function SaveStatus({ status, lastSaved }: SaveStatusProps) {
  const resolvedStatus = status === 'idle' && lastSaved ? 'saved' as SaveStatus : status;

  // Only show saved or error states, hide when idle or saving
  if (resolvedStatus === 'idle' || resolvedStatus === 'saving') return null;

  const getStatusInfo = () => {
    switch (resolvedStatus) {
      case 'saved':
        return {
          text: 'autosaved',
          className: 'saved',
          title: lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Saved'
        };
      case 'error':
        return {
          text: 'autosaved',
          className: 'error',
          title: 'Save failed. Check your connection and try again.'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <div
      className={`save-status-text ${statusInfo.className}`}
      title={statusInfo.title}
      role="status"
      aria-live="polite"
    >
      {statusInfo.text}
    </div>
  );
}

export default SaveStatus;




