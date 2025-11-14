import { Check, AlertCircle, Loader2 } from 'lucide-react';
import './SaveStatus.css';

type SaveStatus = 'saving' | 'saved' | 'error' | 'idle';

interface SaveStatusProps {
  status: SaveStatus;
  lastSaved?: Date;
}

function SaveStatus({ status, lastSaved }: SaveStatusProps) {
  const resolvedStatus = status === 'idle' && lastSaved ? 'saved' as SaveStatus : status;

  if (resolvedStatus === 'idle') return null;

  const getStatusInfo = () => {
    const savedLabel = lastSaved
      ? `Saved at ${lastSaved.toLocaleTimeString()}`
      : 'Saved';

    switch (resolvedStatus) {
      case 'saving':
        return {
          icon: <Loader2 size={16} className="spinning" />,
          label: 'Saving…',
          className: 'saving',
          title: 'Saving changes…'
        };
      case 'saved':
        return {
          icon: <Check size={16} />,
          label: savedLabel,
          className: 'saved',
          title: savedLabel
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          label: 'Save failed',
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
      className={`save-indicator ${statusInfo.className}`}
      title={statusInfo.title}
      role="status"
      aria-live="polite"
    >
      {statusInfo.icon}
      <span className="sr-only">{statusInfo.label}</span>
    </div>
  );
}

export default SaveStatus;




