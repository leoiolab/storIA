import { useState, useEffect } from 'react';
import { AlertTriangle, History, Lightbulb, CheckCircle } from 'lucide-react';
import { ContextSnapshot, ContextImpact } from '../services/context';
import './ContextAwareEditor.css';

interface ContextAwareEditorProps {
  entityId: string;
  entityType: 'character' | 'chapter' | 'plot';
  children: React.ReactNode;
  onSave: (data: any) => void;
  getCurrentData: () => any;
}

function ContextAwareEditor({ 
  entityId, 
  entityType, 
  children, 
  onSave, 
  getCurrentData 
}: ContextAwareEditorProps) {
  const [contextSnapshots, setContextSnapshots] = useState<ContextSnapshot[]>([]);
  const [impacts, setImpacts] = useState<ContextImpact[]>([]);
  const [showContext, setShowContext] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);

  useEffect(() => {
    // Load context history for this entity
    // This would be called when the component mounts or entity changes
    loadContextHistory();
  }, [entityId]);

  const loadContextHistory = () => {
    // This would integrate with the context manager
    // For now, we'll show a placeholder
    setContextSnapshots([]);
    setImpacts([]);
  };

  const handleSave = async (newData: any) => {
    const currentData = getCurrentData();
    
    // Create snapshot of current state
    // const snapshotId = contextManager.createSnapshot(entityType, entityId, currentData, book);
    
    // Analyze impact of changes
    // const impactAnalysis = contextManager.updateSnapshot(snapshotId, newData, book);
    
    // Show impact analysis if there are significant changes
    if (hasSignificantChanges(currentData, newData)) {
      setPendingChanges(newData);
      setShowContext(true);
      return;
    }

    // Save directly if no significant impact
    onSave(newData);
  };

  const hasSignificantChanges = (oldData: any, newData: any): boolean => {
    if (entityType === 'character') {
      return (
        oldData.name !== newData.name ||
        oldData.biography !== newData.biography ||
        oldData.description !== newData.description
      );
    }
    
    if (entityType === 'chapter') {
      return (
        oldData.title !== newData.title ||
        oldData.content !== newData.content
      );
    }

    return false;
  };

  const confirmSave = () => {
    if (pendingChanges) {
      onSave(pendingChanges);
      setPendingChanges(null);
      setShowContext(false);
    }
  };

  const cancelSave = () => {
    setPendingChanges(null);
    setShowContext(false);
  };

  return (
    <div className="context-aware-editor">
      {children}
      
      {/* Context Bar */}
      <div className="context-bar">
        <button
          className="context-button"
          onClick={() => setShowContext(!showContext)}
          title="View context and impact analysis"
        >
          <History size={16} />
          <span>Context</span>
          {impacts.length > 0 && (
            <span className="impact-badge">{impacts.length}</span>
          )}
        </button>

        {contextSnapshots.length > 0 && (
          <div className="context-summary">
            <span className="context-count">
              {contextSnapshots.length} recent changes
            </span>
          </div>
        )}
      </div>

      {/* Context Panel */}
      {showContext && (
        <div className="context-panel">
          <div className="context-header">
            <h3>Context & Impact Analysis</h3>
            <button 
              className="close-button"
              onClick={() => setShowContext(false)}
            >
              ×
            </button>
          </div>

          <div className="context-content">
            {/* Impact Analysis */}
            {impacts.length > 0 && (
              <div className="impact-section">
                <h4>
                  <AlertTriangle size={16} />
                  Potential Impacts
                </h4>
                {impacts.map((impact, index) => (
                  <div key={index} className={`impact-item ${impact.impactLevel}`}>
                    <div className="impact-description">
                      {impact.description}
                    </div>
                    <div className="impact-actions">
                      {impact.suggestedActions.map((action, actionIndex) => (
                        <div key={actionIndex} className="action-item">
                          <Lightbulb size={12} />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Changes */}
            {contextSnapshots.length > 0 && (
              <div className="history-section">
                <h4>
                  <History size={16} />
                  Recent Changes
                </h4>
                {contextSnapshots.slice(0, 5).map((snapshot) => (
                  <div key={snapshot.id} className="history-item">
                    <div className="history-header">
                      <span className="history-type">{snapshot.type}</span>
                      <span className="history-time">
                        {new Date(snapshot.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="history-changes">
                      {Object.keys(snapshot.changes || {}).map(key => (
                        <span key={key} className="change-tag">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Actions */}
            <div className="suggestions-section">
              <h4>
                <Lightbulb size={16} />
                Suggested Actions
              </h4>
              <div className="suggestions-list">
                <div className="suggestion-item">
                  <CheckCircle size={14} />
                  <span>Review related chapters for consistency</span>
                </div>
                <div className="suggestion-item">
                  <CheckCircle size={14} />
                  <span>Update character relationships if needed</span>
                </div>
                <div className="suggestion-item">
                  <CheckCircle size={14} />
                  <span>Check plot continuity</span>
                </div>
              </div>
            </div>

            {/* Pending Changes Confirmation */}
            {pendingChanges && (
              <div className="pending-changes">
                <div className="pending-header">
                  <AlertTriangle size={16} />
                  <span>Pending Changes</span>
                </div>
                <div className="pending-actions">
                  <button className="confirm-button" onClick={confirmSave}>
                    <CheckCircle size={16} />
                    Save Changes
                  </button>
                  <button className="cancel-button" onClick={cancelSave}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextAwareEditor;


