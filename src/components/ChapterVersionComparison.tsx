import { useState, useMemo } from 'react';
import { X, Clock } from 'lucide-react';
import { Chapter, ChapterVersion } from '../types';
import './ChapterVersionComparison.css';

interface ChapterVersionComparisonProps {
  chapter: Chapter;
  onClose: () => void;
}

// Word-level diff algorithm to highlight only changed words
function computeWordDiff(oldText: string, newText: string): Array<{ text: string; type: 'same' | 'added' | 'removed' }> {
  // Split into words while preserving whitespace
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  // Use LCS (Longest Common Subsequence) algorithm for word-level diff
  const lcs = computeLCS(oldWords, newWords);
  const diff: Array<{ text: string; type: 'same' | 'added' | 'removed' }> = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  
  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    // Check if current old word is in LCS
    if (lcsIndex < lcs.length && oldIndex < oldWords.length && oldWords[oldIndex] === lcs[lcsIndex]) {
      // Word is in both - it's the same
      diff.push({ text: oldWords[oldIndex], type: 'same' });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldIndex < oldWords.length && newIndex < newWords.length && oldWords[oldIndex] === newWords[newIndex]) {
      // Words match but not in LCS order - treat as same
      diff.push({ text: oldWords[oldIndex], type: 'same' });
      oldIndex++;
      newIndex++;
    } else if (oldIndex >= oldWords.length) {
      // Only new words remain
      diff.push({ text: newWords[newIndex], type: 'added' });
      newIndex++;
    } else if (newIndex >= newWords.length) {
      // Only old words remain
      diff.push({ text: oldWords[oldIndex], type: 'removed' });
      oldIndex++;
    } else {
      // Words differ - check which one to process
      const oldWord = oldWords[oldIndex];
      const newWord = newWords[newIndex];
      
      // Check if old word appears later in new text
      const oldWordInNew = newWords.slice(newIndex).indexOf(oldWord);
      // Check if new word appears later in old text
      const newWordInOld = oldWords.slice(oldIndex).indexOf(newWord);
      
      if (oldWordInNew !== -1 && (newWordInOld === -1 || oldWordInNew < newWordInOld)) {
        // Old word appears later - this is an addition
        diff.push({ text: newWord, type: 'added' });
        newIndex++;
      } else if (newWordInOld !== -1) {
        // New word appears later - this is a removal
        diff.push({ text: oldWord, type: 'removed' });
        oldIndex++;
      } else {
        // Both are unique - mark as changed
        diff.push({ text: oldWord, type: 'removed' });
        diff.push({ text: newWord, type: 'added' });
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  return diff;
}

// Compute Longest Common Subsequence for better diff matching
function computeLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Build LCS table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Reconstruct LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;
  
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

// Compute aligned word diff for side-by-side comparison
function computeAlignedDiff(oldText: string, newText: string): {
  oldWords: Array<{ text: string; type: 'same' | 'removed' }>;
  newWords: Array<{ text: string; type: 'same' | 'added' }>;
} {
  // Split into words while preserving whitespace and newlines
  const oldWords = oldText.split(/(\s+|\n)/);
  const newWords = newText.split(/(\s+|\n)/);
  
  // Compute word-level diff
  const wordDiff = computeWordDiff(oldText, newText);
  
  // Separate into old and new word arrays
  const oldWordsResult: Array<{ text: string; type: 'same' | 'removed' }> = [];
  const newWordsResult: Array<{ text: string; type: 'same' | 'added' }> = [];
  
  let oldWordIndex = 0;
  let newWordIndex = 0;
  
  for (const diffItem of wordDiff) {
    if (diffItem.type === 'same') {
      oldWordsResult.push({ text: diffItem.text, type: 'same' });
      newWordsResult.push({ text: diffItem.text, type: 'same' });
      oldWordIndex++;
      newWordIndex++;
    } else if (diffItem.type === 'removed') {
      oldWordsResult.push({ text: diffItem.text, type: 'removed' });
      oldWordIndex++;
    } else if (diffItem.type === 'added') {
      newWordsResult.push({ text: diffItem.text, type: 'added' });
      newWordIndex++;
    }
  }
  
  return { oldWords: oldWordsResult, newWords: newWordsResult };
}

// Simple diff algorithm to highlight differences (line-level for structure)
function computeDiff(oldText: string, newText: string): Array<{ text: string; type: 'same' | 'added' | 'removed'; words?: Array<{ text: string; type: 'same' | 'added' | 'removed' }> }> {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: Array<{ text: string; type: 'same' | 'added' | 'removed'; words?: Array<{ text: string; type: 'same' | 'added' | 'removed' }> }> = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Only new lines remain
      const wordDiff = computeWordDiff('', newLines[newIndex]);
      diff.push({ text: newLines[newIndex], type: 'added', words: wordDiff });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Only old lines remain
      const wordDiff = computeWordDiff(oldLines[oldIndex], '');
      diff.push({ text: oldLines[oldIndex], type: 'removed', words: wordDiff });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines match exactly
      diff.push({ text: oldLines[oldIndex], type: 'same' });
      oldIndex++;
      newIndex++;
    } else {
      // Lines differ - do word-level diff
      const wordDiff = computeWordDiff(oldLines[oldIndex], newLines[newIndex]);
      diff.push({ text: oldLines[oldIndex], type: 'removed', words: wordDiff });
      diff.push({ text: newLines[newIndex], type: 'added', words: wordDiff });
      oldIndex++;
      newIndex++;
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

  const alignedDiff = useMemo(() => {
    if (!selectedVersion1 || !selectedVersion2) {
      return null;
    }
    return computeAlignedDiff(selectedVersion1.content, selectedVersion2.content);
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

          {selectedVersion1 && selectedVersion2 && alignedDiff && (
            <div className="version-diff-view">
              <div className="diff-panel">
                <div className="diff-panel-header">
                  <h3>{selectedVersion1.title}</h3>
                  <span className="diff-timestamp">
                    {new Date(selectedVersion1.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="diff-content">
                  {alignedDiff.oldWords.map((word, index) => (
                    <span
                      key={index}
                      className={`diff-word ${word.type === 'removed' ? 'word-removed' : ''}`}
                    >
                      {word.text}
                    </span>
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
                  {alignedDiff.newWords.map((word, index) => (
                    <span
                      key={index}
                      className={`diff-word ${word.type === 'added' ? 'word-added' : ''}`}
                    >
                      {word.text}
                    </span>
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

