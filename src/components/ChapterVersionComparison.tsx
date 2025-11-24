import { useState, useMemo } from 'react';
import { X, Clock } from 'lucide-react';
import { Chapter, ChapterVersion } from '../types';
import './ChapterVersionComparison.css';

interface ChapterVersionComparisonProps {
  chapter: Chapter;
  onClose: () => void;
}

// Simple diff algorithm to highlight differences
function computeDiff(oldText: string, newText: string): Array<{ text: string; type: 'same' | 'added' | 'removed' }> {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: Array<{ text: string; type: 'same' | 'added' | 'removed' }> = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Only new lines remain
      diff.push({ text: newLines[newIndex], type: 'added' });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Only old lines remain
      diff.push({ text: oldLines[oldIndex], type: 'removed' });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match
      diff.push({ text: oldLines[oldIndex], type: 'same' });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - check if it's an addition or removal
      const nextOldMatch = newLines.findIndex((line, idx) => idx >= newIndex && line === oldLines[oldIndex]);
      const nextNewMatch = oldLines.findIndex((line, idx) => idx >= oldIndex && line === newLines[newIndex]);
      
      if (nextOldMatch !== -1 && (nextNewMatch === -1 || nextOldMatch < nextNewMatch)) {
        // Addition
        diff.push({ text: newLines[newIndex], type: 'added' });
        newIndex++;
      } else if (nextNewMatch !== -1) {
        // Removal
        diff.push({ text: oldLines[oldIndex], type: 'removed' });
        oldIndex++;
      } else {
        // Both changed
        diff.push({ text: oldLines[oldIndex], type: 'removed' });
        diff.push({ text: newLines[newIndex], type: 'added' });
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  return diff;
}

function ChapterVersionComparison({ chapter, onClose }: ChapterVersionComparisonProps) {
  const [selectedVersion1, setSelectedVersion1] = useState<ChapterVersion | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<ChapterVersion | null>(null);

  const versions = useMemo(() => {
    if (!chapter.versions || chapter.versions.length === 0) {
      return [];
    }
    // Sort by timestamp descending (newest first)
    return [...chapter.versions].sort((a, b) => b.timestamp - a.timestamp);
  }, [chapter.versions]);

  const diff = useMemo(() => {
    if (!selectedVersion1 || !selectedVersion2) {
      return null;
    }
    return computeDiff(selectedVersion1.content, selectedVersion2.content);
  }, [selectedVersion1, selectedVersion2]);

  if (!chapter.versions || chapter.versions.length === 0) {
    return (
      <div className="version-comparison-overlay">
        <div className="version-comparison-modal">
          <div className="version-comparison-header">
            <h2>Version History</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="version-comparison-empty">
            <Clock size={48} />
            <p>No version history available for this chapter yet.</p>
            <p className="empty-hint">Versions are automatically saved when you make changes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="version-comparison-overlay">
      <div className="version-comparison-modal">
        <div className="version-comparison-header">
          <h2>Compare Versions</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="version-comparison-content">
          <div className="version-selectors">
            <div className="version-selector">
              <label>Version 1 (Older)</label>
              <select
                value={selectedVersion1 ? selectedVersion1.timestamp.toString() : ''}
                onChange={(e) => {
                  const version = versions.find(v => v.timestamp.toString() === e.target.value);
                  setSelectedVersion1(version || null);
                }}
              >
                <option value="">Select version...</option>
                {versions.map((version, index) => (
                  <option key={version.timestamp} value={version.timestamp.toString()}>
                    {new Date(version.timestamp).toLocaleString()} {index === versions.length - 1 ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="version-selector">
              <label>Version 2 (Newer)</label>
              <select
                value={selectedVersion2 ? selectedVersion2.timestamp.toString() : ''}
                onChange={(e) => {
                  const version = versions.find(v => v.timestamp.toString() === e.target.value);
                  setSelectedVersion2(version || null);
                }}
              >
                <option value="">Select version...</option>
                {versions.map((version, index) => (
                  <option key={version.timestamp} value={version.timestamp.toString()}>
                    {new Date(version.timestamp).toLocaleString()} {index === 0 ? '(Latest)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedVersion1 && selectedVersion2 && diff && (
            <div className="version-diff-view">
              <div className="diff-panel">
                <div className="diff-panel-header">
                  <h3>{selectedVersion1.title}</h3>
                  <span className="diff-timestamp">
                    {new Date(selectedVersion1.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="diff-content">
                  {diff.map((item, index) => (
                    <div
                      key={index}
                      className={`diff-line ${item.type === 'removed' ? 'removed' : item.type === 'same' ? 'same' : ''}`}
                    >
                      {item.type === 'removed' || item.type === 'same' ? item.text : ''}
                    </div>
                  ))}
                </div>
              </div>

              <div className="diff-panel">
                <div className="diff-panel-header">
                  <h3>{selectedVersion2.title}</h3>
                  <span className="diff-timestamp">
                    {new Date(selectedVersion2.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="diff-content">
                  {diff.map((item, index) => (
                    <div
                      key={index}
                      className={`diff-line ${item.type === 'added' ? 'added' : item.type === 'same' ? 'same' : ''}`}
                    >
                      {item.type === 'added' || item.type === 'same' ? item.text : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(!selectedVersion1 || !selectedVersion2) && (
            <div className="version-comparison-placeholder">
              <p>Select two versions to compare</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChapterVersionComparison;

