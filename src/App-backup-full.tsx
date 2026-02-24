import { useState, useEffect } from 'react';
import Sidebar, { View } from './components/Sidebar';
import ProjectSwitcher from './components/ProjectSwitcher';
import CharactersList from './components/CharactersList';
import CharacterEditor from './components/CharacterEditor';
import ChaptersList from './components/ChaptersList';
import ChapterEditor from './components/ChapterEditor';
import BookMetadataEditor from './components/BookMetadataEditor';
import RelationshipMap from './components/RelationshipMap';
import StoryArcView from './components/StoryArcView';
import ReaderView from './components/ReaderView';
import AIChat from './components/AIChat';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
import AIAssistant from './components/AIAssistant';
import SaveStatus from './components/SaveStatus';
import AuthScreen from './components/AuthScreen';
import { Character, Chapter, Book, AppData, AIConfig, BookMetadata, PlotPoint, Timeline } from './types';
import { initializeAI, isAIConfigured } from './services/ai';
import { StorageService } from './services/storage';
import { CloudStorageService, AuthUser } from './services/cloudStorage';
import { debugStorage } from './utils/debug';
import './App.css';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<View>('metadata');
  const [appData, setAppData] = useState<AppData>({
    books: [],
    currentBookId: null,
    aiConfig: {
      provider: 'none',
      apiKey: '',
      model: 'gpt-4-turbo-preview',
    },
  });
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCharacterAI, setShowCharacterAI] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // TEMP: Skip cloud auth for local development
      // Comment out these lines to enable cloud mode
      setAuthChecked(true);
      // Set a dummy user to bypass auth
      setUser({ id: 'local', email: 'local@authorio.app', name: 'Local User', token: 'local' });
      
      // Load from localStorage instead
      const savedData = StorageService.loadData();
      if (savedData && StorageService.validateData(savedData)) {
        console.log('Loaded saved data:', savedData);
        setAppData(savedData);
      } else {
        console.log('No saved data, creating new book');
        // Create initial book inline
        const newBook: Book = {
          id: Date.now().toString(),
          metadata: {
            title: 'Untitled Book',
            author: 'Local User',
            genre: '',
          },
          characters: [],
          chapters: [],
          plotPoints: [],
          timeline: {
            id: Date.now().toString(),
            events: [],
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setAppData({
          books: [newBook],
          currentBookId: newBook.id,
          aiConfig: {
            provider: 'none',
            apiKey: '',
            model: 'gpt-4-turbo-preview',
          },
        });
      }
      return;
      
      /* CLOUD MODE - Uncomment to enable:
      if (CloudStorageService.isAuthenticated()) {
        try {
          const currentUser = await CloudStorageService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Auth check failed:', error);
          CloudStorageService.clearToken();
        }
      }
      setAuthChecked(true);
      */
    };

    checkAuth();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (appData.books.length > 0) {
      StorageService.saveData(appData);
    }
  }, [appData]);

  // Load data from cloud when authenticated (DISABLED FOR LOCAL MODE)
  /*
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);
  */

  const loadProjects = async () => {
    try {
      const projects = await CloudStorageService.getProjects();
      setAppData(prev => ({
        ...prev,
        books: projects,
        currentBookId: projects.length > 0 ? projects[0].id : null,
      }));

      if (projects.length === 0) {
        // Create first project
        await createNewBook();
      } else if (projects.length > 0) {
        // Load the first project's details
        const firstProject = await CloudStorageService.getProject(projects[0].id);
        setAppData(prev => ({
          ...prev,
          books: [firstProject, ...projects.slice(1)],
          currentBookId: firstProject.id,
        }));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const currentBook = appData.books.find(b => b.id === appData.currentBookId) || null;

  const createNewBook = async () => {
    // LOCAL MODE: Create book locally
    const newBook: Book = {
      id: Date.now().toString(),
      metadata: {
        title: 'Untitled Book',
        author: user?.name || '',
        genre: '',
      },
      characters: [],
      chapters: [],
      plotPoints: [],
      timeline: {
        id: Date.now().toString(),
        events: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setAppData(prev => ({
      ...prev,
      books: [...prev.books, newBook],
      currentBookId: newBook.id,
    }));
    setView('metadata');
    
    /* CLOUD MODE - Uncomment to enable:
    try {
      const newProject = await CloudStorageService.createProject('Untitled Book', {
        title: 'Untitled Book',
        author: user?.name || '',
        genre: '',
      });

      console.log('Creating new project:', newProject);
      setAppData(prev => ({
        ...prev,
        books: [...prev.books, newProject],
        currentBookId: newProject.id,
      }));
      setView('metadata');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
    */
  };

  const updateCurrentBook = (updater: (book: Book) => Book) => {
    if (!currentBook) return;

    setAppData(prev => {
      const updatedBooks = prev.books.map(book =>
        book.id === currentBook.id
          ? { ...updater(book), updatedAt: Date.now() }
          : book
      );
      
      const updatedData = {
        ...prev,
        books: updatedBooks,
      };
      
      console.log('Updating current book:', updatedData);
      return updatedData;
    });
  };

  const handleAddCharacter = (character: Character) => {
    updateCurrentBook(book => ({
      ...book,
      characters: [...book.characters, character],
    }));
    setSelectedCharacter(character);
  };

  const handleUpdateCharacter = (updatedCharacter: Character) => {
    console.log('Updating character:', updatedCharacter);
    updateCurrentBook(book => ({
      ...book,
      characters: book.characters.map(c =>
        c.id === updatedCharacter.id ? updatedCharacter : c
      ),
    }));
    setSelectedCharacter(updatedCharacter);
  };

  const handleDeleteCharacter = (id: string) => {
    updateCurrentBook(book => ({
      ...book,
      characters: book.characters.filter(c => c.id !== id),
    }));
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(null);
    }
  };

  const handleAddChapter = (chapter: Chapter) => {
    updateCurrentBook(book => ({
      ...book,
      chapters: [...book.chapters, chapter],
    }));
    setSelectedChapter(chapter);
  };

  const handleUpdateChapter = (updatedChapter: Chapter) => {
    console.log('Updating chapter:', updatedChapter);
    updateCurrentBook(book => ({
      ...book,
      chapters: book.chapters.map(c =>
        c.id === updatedChapter.id ? updatedChapter : c
      ),
    }));
    setSelectedChapter(updatedChapter);
  };

  const handleDeleteChapter = (id: string) => {
    updateCurrentBook(book => ({
      ...book,
      chapters: book.chapters.filter(c => c.id !== id),
    }));
    if (selectedChapter?.id === id) {
      setSelectedChapter(null);
    }
  };

  const handleUpdateMetadata = (metadata: BookMetadata) => {
    console.log('Updating metadata:', metadata);
    updateCurrentBook(book => ({
      ...book,
      metadata,
    }));
  };

  const handleSaveSettings = (aiConfig: AIConfig) => {
    setAppData(prev => ({
      ...prev,
      aiConfig,
    }));
    if (aiConfig.apiKey) {
      initializeAI(aiConfig.apiKey);
    }
  };

  const handleAICharacterGenerate = (characterData: Partial<Character>) => {
    if (!currentBook) return;

    const newCharacter: Character = {
      id: Date.now().toString(),
      name: characterData.name || 'AI Generated Character',
      type: selectedCharacter?.type || 'main',
      description: characterData.description || '',
      biography: characterData.biography || '',
      age: characterData.age,
      role: characterData.role,
      relationships: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (selectedCharacter) {
      handleUpdateCharacter({
        ...selectedCharacter,
        ...characterData,
      });
    } else {
      handleAddCharacter(newCharacter);
    }
    setShowCharacterAI(false);
  };

  const handleAIChapterGenerate = (content: string) => {
    if (!selectedChapter) return;

    handleUpdateChapter({
      ...selectedChapter,
      content: selectedChapter.content + (selectedChapter.content ? '\n\n' : '') + content,
    });
  };

  const renderContent = () => {
    if (!currentBook) {
      return (
        <div className="no-project">
          <h2>No Project Selected</h2>
          <p>Create a new project to get started</p>
          <button className="button-primary" onClick={createNewBook}>
            Create New Book
          </button>
        </div>
      );
    }

    switch (view) {
      case 'metadata':
        return (
          <BookMetadataEditor
            metadata={currentBook.metadata}
            onUpdateMetadata={handleUpdateMetadata}
          />
        );

      case 'characters':
        return (
          <>
            <CharactersList
              characters={currentBook.characters}
              selectedCharacter={selectedCharacter}
              onSelectCharacter={setSelectedCharacter}
              onAddCharacter={handleAddCharacter}
              onDeleteCharacter={handleDeleteCharacter}
            />
            <div className="editor-with-ai">
              <CharacterEditor
                character={selectedCharacter}
                onUpdateCharacter={handleUpdateCharacter}
              />
              {isAIConfigured() && selectedCharacter && (
                <div className="ai-panel">
                  <AIAssistant
                    type="character"
                    context={{ characterType: selectedCharacter.type }}
                    onGenerate={handleAICharacterGenerate}
                  />
                </div>
              )}
            </div>
          </>
        );

      case 'chapters':
        return (
          <>
            <ChaptersList
              chapters={currentBook.chapters}
              selectedChapter={selectedChapter}
              onSelectChapter={setSelectedChapter}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
            />
            <div className="editor-with-ai">
              <ChapterEditor
                chapter={selectedChapter}
                onUpdateChapter={handleUpdateChapter}
              />
              {isAIConfigured() && selectedChapter && (
                <div className="ai-panel">
                  <AIAssistant
                    type="chapter"
                    context={{
                      chapterTitle: selectedChapter.title,
                      characters: currentBook.characters,
                      previousContent: selectedChapter.content,
                    }}
                    onGenerate={handleAIChapterGenerate}
                  />
                </div>
              )}
            </div>
          </>
        );

      case 'relationships':
        return (
          <RelationshipMap
            characters={currentBook.characters}
            onUpdateCharacter={handleUpdateCharacter}
            onCreateCharacter={() => setView('characters')}
          />
        );

      case 'storyarc':
        return (
          <StoryArcView
            chapters={currentBook.chapters}
            plotPoints={currentBook.plotPoints}
          />
        );

      case 'reader':
        return <ReaderView book={currentBook} />;

      case 'chat':
        return (
          <div className="chat-view">
            <div className="chat-main">
              <div className="chat-welcome">
                <h2>AI Writing Assistant</h2>
                <p>Chat with your AI writing partner to get help with characters, plot, writing, and more.</p>
                <div className="chat-features">
                  <div className="feature-item">
                    <strong>Character Development</strong>
                    <span>Get help developing your characters' personalities, backstories, and arcs</span>
                  </div>
                  <div className="feature-item">
                    <strong>Plot & Structure</strong>
                    <span>Brainstorm plot ideas, overcome writer's block, plan story structure</span>
                  </div>
                  <div className="feature-item">
                    <strong>Writing & Editing</strong>
                    <span>Generate content, improve your prose, refine dialogue and descriptions</span>
                  </div>
                </div>
              </div>
            </div>
            <AIChat
              book={currentBook}
              selectedCharacter={selectedCharacter}
              selectedChapter={selectedChapter}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Debug: Show loading state
  console.log('Render state:', { authChecked, user, booksCount: appData.books.length });

  // Show auth screen if not authenticated
  if (!authChecked) {
    return <div className="app loading" style={{color: 'white', padding: '40px'}}>Checking authentication...</div>;
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={(authUser) => setUser(authUser)} />;
  }

  // Debug: Add visible marker
  console.log('Rendering main app...');

  return (
    <div className="app">
      <Sidebar view={view} onViewChange={setView}>
        <ProjectSwitcher
          books={appData.books}
          currentBook={currentBook}
          onSelectBook={(id) => setAppData(prev => ({ ...prev, currentBookId: id }))}
          onCreateBook={createNewBook}
          onOpenSettings={() => setShowSettings(true)}
          onOpenExport={() => setShowExport(true)}
        />
      </Sidebar>

      <div className="content">
        {renderContent()}
      </div>

      <SettingsModal
        isOpen={showSettings}
        aiConfig={appData.aiConfig}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />

      <ExportModal
        isOpen={showExport}
        book={currentBook}
        onClose={() => setShowExport(false)}
      />

      <SaveStatus status={saveStatus} lastSaved={lastSaved} />
    </div>
  );
}

export default App;
