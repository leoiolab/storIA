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
import KindleReader from './components/KindleReader';
import CursorAgent, { AgentMessage } from './components/CursorAgent';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
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
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [showAgent, setShowAgent] = useState(false);

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

  // Save agent messages to localStorage
  useEffect(() => {
    if (agentMessages.length > 0) {
      localStorage.setItem('authorio_agent_history', JSON.stringify(agentMessages));
    }
  }, [agentMessages]);

  // Load agent history on mount
  useEffect(() => {
    const savedAgent = localStorage.getItem('authorio_agent_history');
    if (savedAgent) {
      try {
        setAgentMessages(JSON.parse(savedAgent));
      } catch (e) {
        console.error('Failed to load agent history:', e);
      }
    }
  }, []);

  // Keyboard shortcut to toggle agent (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowAgent(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  // Old AI Assistant handlers removed - now using unified AI Agent

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
            <CharacterEditor
              character={selectedCharacter}
              allCharacters={currentBook.characters}
              onUpdateCharacter={handleUpdateCharacter}
            />
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
            <ChapterEditor
              chapter={selectedChapter}
              onUpdateChapter={handleUpdateChapter}
            />
          </>
        );

      case 'relationships':
        console.log('Rendering RelationshipMap with characters:', currentBook.characters);
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
        return <KindleReader book={currentBook} />;

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
    <div className={`app ${showAgent ? 'agent-open' : ''}`}>
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

      {/* Cursor-Style AI Agent - Collapsible Side Panel */}
      {currentBook && (
        <CursorAgent
          book={currentBook}
          currentChapter={selectedChapter}
          currentCharacter={selectedCharacter}
          messages={agentMessages}
          setMessages={setAgentMessages}
          isOpen={showAgent}
          onClose={() => setShowAgent(false)}
          onInsertText={(text) => {
            // Insert into current chapter if editing
            if (selectedChapter) {
              handleUpdateChapter({
                ...selectedChapter,
                content: selectedChapter.content + '\n\n' + text
              });
            }
          }}
          onUpdateChapter={(content) => {
            // Replace chapter content with AI-improved version
            if (selectedChapter) {
              handleUpdateChapter({
                ...selectedChapter,
                content: content
              });
            }
          }}
          onCreateCharacter={(characterData) => {
            // Create new character from AI data
            console.log('=== CREATE CHARACTER CALLED ===');
            console.log('Received characterData:', characterData);
            
            const newCharacter: Character = {
              id: Date.now().toString(),
              name: characterData.name || 'New Character',
              type: characterData.type || 'secondary',
              description: characterData.quickDescription || characterData.description || '',
              biography: characterData.fullBio || characterData.biography || characterData.bio || '',
              age: characterData.age,
              role: characterData.role,
              relationships: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            
            console.log('Created character object:', newCharacter);
            console.log('Description:', newCharacter.description);
            console.log('Biography:', newCharacter.biography);
            
            handleAddCharacter(newCharacter);
            setSelectedCharacter(newCharacter);
            setView('characters');
            
            console.log('=== CHARACTER ADDED TO STATE ===');
          }}
          onUpdateCharacter={(characterData) => {
            // Update current character with AI data
            if (selectedCharacter) {
              handleUpdateCharacter({
                ...selectedCharacter,
                description: characterData.quickDescription || characterData.description || selectedCharacter.description,
                biography: characterData.fullBio || characterData.biography || characterData.bio || selectedCharacter.biography,
                age: characterData.age || selectedCharacter.age,
                role: characterData.role || selectedCharacter.role,
              });
            }
          }}
        />
      )}

      {/* Agent Toggle Button - Shows when panel is closed */}
      {currentBook && !showAgent && (
        <button
          className="agent-toggle-btn"
          onClick={() => setShowAgent(true)}
          title="Open AI Agent (⌘K)"
        >
          ✨ AI Agent
        </button>
      )}
    </div>
  );
}

export default App;
