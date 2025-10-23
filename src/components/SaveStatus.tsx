import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './SaveStatus.css';

type SaveStatus = 'saving' | 'saved' | 'error' | 'idle';

interface SaveStatusProps {
  status: SaveStatus;
  lastSaved?: Date;
}

function SaveStatus({ status, lastSaved }: SaveStatusProps) {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (status === 'saving' || status === 'error') {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    } else if (status === 'saved') {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!showStatus && status === 'idle') return null;

  const getStatusInfo = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader size={14} className="spinning" />,
          text: 'Saving...',
          className: 'saving'
        };
      case 'saved':
        return {
          icon: <CheckCircle size={14} />,
          text: 'Saved',
          className: 'saved'
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          text: 'Save failed',
          className: 'error'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <div className={`save-status ${statusInfo.className}`}>
      {statusInfo.icon}
      <span>{statusInfo.text}</span>
      {lastSaved && status === 'saved' && (
        <span className="last-saved">
          {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

export default SaveStatus;


