import React, { useState } from 'react';
import { Book as BookType } from '../types';
import { Book, Plus, LogOut, Trash2 } from 'lucide-react';
import './BookSelectionScreen.css';

interface BookSelectionScreenProps {
  books: BookType[];
  onSelectBook: (bookId: string) => void;
  onCreateBook: () => void;
  onDeleteBook: (bookId: string) => void;
  onLogout: () => void;
  userName?: string | null;
  isLoading?: boolean;
}

function BookSelectionScreen({
  books,
  onSelectBook,
  onCreateBook,
  onDeleteBook,
  onLogout,
  userName,
  isLoading = false,
}: BookSelectionScreenProps) {
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      setDeletingBookId(bookId);
      onDeleteBook(bookId);
      setTimeout(() => setDeletingBookId(null), 1000);
    }
  };
  const getBookInitials = (title: string) => {
    return title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join('')
      .substring(0, 2) || '📖';
  };

  const getBookColor = (index: number) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="book-selection-screen">
        <div className="book-selection-loading">
          <div className="loading-spinner"></div>
          <p>Loading your books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="book-selection-screen">
      <div className="book-selection-header">
        <div className="book-selection-title">
          <h1>✨ StorIA</h1>
          <p>Select a book to continue</p>
        </div>
        <div className="book-selection-user">
          {userName && (
            <span className="user-greeting">Welcome, {userName}</span>
          )}
          <button className="logout-btn" onClick={onLogout} title="Log out">
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </div>

      <div className="book-selection-content">
        <div className="books-grid">
          {books.map((book, index) => (
            <div
              key={book.id}
              className="book-tile"
              onClick={() => onSelectBook(book.id)}
            >
              <div className="book-tile-header">
                <div
                  className="book-cover"
                  style={{ background: getBookColor(index) }}
                >
                  <div className="book-cover-initials">
                    {getBookInitials(book.metadata.title)}
                  </div>
                </div>
                <button
                  className="book-delete-btn"
                  onClick={(e) => handleDeleteClick(e, book.id)}
                  title="Delete book"
                  disabled={deletingBookId === book.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="book-tile-info">
                <h3 className="book-tile-title">{book.metadata.title}</h3>
                <p className="book-tile-author">{book.metadata.author || 'Unknown Author'}</p>
                <div className="book-tile-stats">
                  <span>{book.chapters.length} chapters</span>
                  <span>•</span>
                  <span>{book.characters.length} characters</span>
                </div>
              </div>
            </div>
          ))}

          <div className="book-tile create-new" onClick={onCreateBook}>
            <div className="book-cover create-cover">
              <Plus size={32} />
            </div>
            <div className="book-tile-info">
              <h3 className="book-tile-title">Create New Book</h3>
              <p className="book-tile-author">Start a new project</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookSelectionScreen;

