import { useState } from 'react';
import { X, FileText, FileDown, Ruler } from 'lucide-react';
import { Book } from '../types';
import { exportToPDF, exportToWord, exportToMarkdown, exportToPlainText, BookFormat, BOOK_FORMATS } from '../services/export';
import './Modal.css';

interface ExportModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

function ExportModal({ isOpen, book, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>('trade');
  const [exportType, setExportType] = useState<'pdf' | 'word' | 'markdown' | 'txt' | null>(null);

  if (!isOpen || !book) return null;

  const handleExport = async (type: 'pdf' | 'word' | 'markdown' | 'txt') => {
    try {
      switch (type) {
        case 'pdf':
          await exportToPDF(book, selectedFormat);
          break;
        case 'word':
          await exportToWord(book, selectedFormat);
          break;
        case 'markdown':
          exportToMarkdown(book);
          break;
        case 'txt':
          exportToPlainText(book);
          break;
      }
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Book</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <h3>{book.metadata.title}</h3>
            <p className="form-description">
              Choose a format and size to export your book.
            </p>

            {/* Book Format Selection (for PDF and Word) */}
            {(exportType === 'pdf' || exportType === 'word') && (
              <div className="export-format-selection">
                <label className="export-label">
                  <Ruler size={16} />
                  <span>Book Format:</span>
                </label>
                <div className="format-options">
                  {Object.entries(BOOK_FORMATS).map(([key, format]) => (
                    <button
                      key={key}
                      className={`format-option ${selectedFormat === key ? 'active' : ''}`}
                      onClick={() => setSelectedFormat(key as BookFormat)}
                    >
                      <div className="format-name">{format.name}</div>
                      <div className="format-size">{format.width}" × {format.height}"</div>
                      <div className="format-description">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export Type Selection */}
            <div className="export-options">
              <button
                className={`export-option ${exportType === 'pdf' ? 'selected' : ''}`}
                onClick={() => {
                  setExportType('pdf');
                  if (exportType === 'pdf') {
                    handleExport('pdf');
                  }
                }}
              >
                <FileText size={32} />
                <span>PDF</span>
                {exportType === 'pdf' && <span className="export-hint">Select format above</span>}
              </button>

              <button
                className={`export-option ${exportType === 'word' ? 'selected' : ''}`}
                onClick={() => {
                  setExportType('word');
                  if (exportType === 'word') {
                    handleExport('word');
                  }
                }}
              >
                <FileDown size={32} />
                <span>Word (.docx)</span>
                {exportType === 'word' && <span className="export-hint">Select format above</span>}
              </button>

              <button
                className={`export-option ${exportType === 'markdown' ? 'selected' : ''}`}
                onClick={() => {
                  if (exportType === 'markdown') {
                    handleExport('markdown');
                  } else {
                    setExportType('markdown');
                  }
                }}
              >
                <FileText size={32} />
                <span>Markdown (.md)</span>
              </button>

              <button
                className={`export-option ${exportType === 'txt' ? 'selected' : ''}`}
                onClick={() => {
                  if (exportType === 'txt') {
                    handleExport('txt');
                  } else {
                    setExportType('txt');
                  }
                }}
              >
                <FileText size={32} />
                <span>Plain Text (.txt)</span>
              </button>
            </div>

            {/* Export Button (for PDF and Word after format selection) */}
            {(exportType === 'pdf' || exportType === 'word') && (
              <div className="export-action">
                <button
                  className="button button-primary"
                  onClick={() => handleExport(exportType)}
                >
                  Export as {exportType.toUpperCase()} ({BOOK_FORMATS[selectedFormat].name})
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;








