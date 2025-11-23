import { X, FileText, FileDown } from 'lucide-react';
import { Book } from '../types';
import { exportToPDF, exportToWord, exportToMarkdown, exportToPlainText } from '../services/export';
import './Modal.css';

interface ExportModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
}

function ExportModal({ isOpen, book, onClose }: ExportModalProps) {
  if (!isOpen || !book) return null;

  const handleExport = async (format: 'pdf' | 'word' | 'markdown' | 'txt') => {
    try {
      switch (format) {
        case 'pdf':
          await exportToPDF(book);
          break;
        case 'word':
          await exportToWord(book);
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
              Choose a format to export your book.
            </p>

            <div className="export-options">
              <button
                className="export-option"
                onClick={() => handleExport('pdf')}
              >
                <FileText size={32} />
                <span>PDF</span>
              </button>

              <button
                className="export-option"
                onClick={() => handleExport('word')}
              >
                <FileDown size={32} />
                <span>Word (.docx)</span>
              </button>

              <button
                className="export-option"
                onClick={() => handleExport('markdown')}
              >
                <FileText size={32} />
                <span>Markdown (.md)</span>
              </button>

              <button
                className="export-option"
                onClick={() => handleExport('txt')}
              >
                <FileText size={32} />
                <span>Plain Text (.txt)</span>
              </button>
            </div>
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







