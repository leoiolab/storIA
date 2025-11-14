import { useState, useEffect, useCallback } from 'react';
import Sidebar, { View } from './components/Sidebar';
import ProjectSwitcher from './components/ProjectSwitcher';
import CharactersList from './components/CharactersList';
import CharacterEditor, { EntityState } from './components/CharacterEditor';
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
import { Character, Chapter, Book, AppData, AIConfig, BookMetadata, PlotPoint, Timeline, ProjectSettings } from './types';
import { initializeAI, isAIConfigured } from './services/ai';
import { CloudStorageService, AuthUser } from './services/cloudStorage';
import './App.css';

const createInitialAppData = (): AppData => ({
  books: [],
  currentBookId: null,
  aiConfig: {
    provider: 'none',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
  },
});

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<View>('metadata');
  const [appData, setAppData] = useState<AppData>(createInitialAppData);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [showAgent, setShowAgent] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [characterState, setCharacterState] = useState<EntityState>('new');
  const [chapterState, setChapterState] = useState<EntityState>('new');

  const deriveAIConfigFromSettings = useCallback(
    (settings?: ProjectSettings | null): AIConfig => ({
      provider: settings?.aiProvider ?? 'none',
      apiKey: settings?.aiApiKey ?? '',
      model: settings?.aiModel ?? 'gpt-4-turbo-preview',
    }),
    []
  );

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (CloudStorageService.isAuthenticated()) {
          const currentUser = await CloudStorageService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        CloudStorageService.clearToken();
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

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

  const loadProjects = useCallback(async () => {
    if (!user) return;

    setIsLoadingBooks(true);
    setSaveStatus('saving');

    try {
      const projects = await CloudStorageService.getProjects();
      setSelectedCharacter(null);
      setSelectedChapter(null);

      if (projects.length === 0) {
        const defaultMetadata: BookMetadata = {
          title: 'Untitled Book',
          author: user.name || '',
          genre: '',
        };
        const newProject = await CloudStorageService.createProject(defaultMetadata.title, defaultMetadata);

        setAppData(prev => ({
          ...prev,
          books: [newProject],
          currentBookId: newProject.id,
          aiConfig: createInitialAppData().aiConfig,
        }));
        setView('metadata');
        initializeAI('');
      } else {
        const [firstProject, ...otherProjects] = projects;
        const detailedFirst = await CloudStorageService.getProject(firstProject.id);
        
        // Debug: Log settings to help diagnose issues
        console.log('Loaded project settings:', {
          projectId: detailedFirst.id,
          settings: detailedFirst.settings,
          hasApiKey: !!detailedFirst.settings?.aiApiKey
        });
        
        const nextAiConfig = deriveAIConfigFromSettings(detailedFirst.settings);

        setAppData(prev => ({
          ...prev,
          books: [detailedFirst, ...otherProjects],
          currentBookId: detailedFirst.id,
          aiConfig: nextAiConfig,
        }));

        if (nextAiConfig.apiKey) {
          console.log('Initializing AI with API key');
          initializeAI(nextAiConfig.apiKey);
        } else {
          console.log('No API key found, initializing AI without key');
          initializeAI('');
        }
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to load projects:', error);
      setSaveStatus('error');
    } finally {
      setIsLoadingBooks(false);
    }
  }, [user, deriveAIConfigFromSettings]);

  useEffect(() => {
    if (user) {
      loadProjects();
    } else {
      setAppData(prev => ({
        ...prev,
        books: [],
        currentBookId: null,
      }));
      setSelectedCharacter(null);
      setSelectedChapter(null);
    }
  }, [user, loadProjects]);

  const handleLogout = () => {
    CloudStorageService.logout();
    localStorage.removeItem('authorio_agent_history');
    setUser(null);
    setAppData(createInitialAppData());
    setSelectedCharacter(null);
    setSelectedChapter(null);
    setAgentMessages([]);
    setShowAgent(false);
    setView('metadata');
    setSaveStatus('idle');
    setLastSaved(undefined);
  };

  const handleSelectBook = async (bookId: string) => {
    if (!user || bookId === appData.currentBookId) return;

    setIsLoadingBooks(true);
    setSaveStatus('saving');

    try {
      const project = await CloudStorageService.getProject(bookId);
      const nextAiConfig = deriveAIConfigFromSettings(project.settings);

      setAppData(prev => {
        const remaining = prev.books.filter(book => book.id !== bookId);
        return {
          ...prev,
          books: [project, ...remaining],
          currentBookId: bookId,
          aiConfig: nextAiConfig,
        };
      });

      if (nextAiConfig.apiKey) {
        initializeAI(nextAiConfig.apiKey);
      } else {
        initializeAI('');
      }
      setSelectedCharacter(null);
      setSelectedChapter(null);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to select project:', error);
      setSaveStatus('error');
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const currentBook = appData.books.find(b => b.id === appData.currentBookId) || null;

  const createNewBook = async () => {
    if (!user) return;

    setSaveStatus('saving');

    try {
      const metadata: BookMetadata = {
        title: 'Untitled Book',
        author: user.name || '',
        genre: '',
      };

      const newProject = await CloudStorageService.createProject(metadata.title, metadata);

      setAppData(prev => ({
        ...prev,
        books: [newProject, ...prev.books.filter(book => book.id !== newProject.id)],
        currentBookId: newProject.id,
        aiConfig: createInitialAppData().aiConfig,
      }));
      setSelectedCharacter(null);
      setSelectedChapter(null);
      setView('metadata');
      setSaveStatus('saved');
      setLastSaved(new Date());
      initializeAI('');
    } catch (error) {
      console.error('Failed to create project:', error);
      setSaveStatus('error');
    }
  };

  const updateCurrentBook = (updater: (book: Book) => Book) => {
    if (!currentBook) return;

    setAppData(prev => {
      const updatedBooks = prev.books.map(book =>
        book.id === currentBook.id
          ? { ...updater(book), updatedAt: Date.now() }
          : book
      );
      
      return {
        ...prev,
        books: updatedBooks,
      };
    });
  };

  const handleAddCharacter = async (character: Character) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      const payload: Omit<Character, 'id'> = {
        name: character.name,
        type: character.type,
        description: character.description,
        biography: character.biography,
        characterArc: character.characterArc,
        age: character.age,
        role: character.role,
        relationships: character.relationships,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      };

      const created = await CloudStorageService.createCharacter(currentBook.id, payload);

      updateCurrentBook(book => ({
        ...book,
        characters: [...book.characters, created],
      }));
      setSelectedCharacter(created);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to add character:', error);
      setSaveStatus('error');
    }
  };

  const handleUpdateCharacter = async (character: Character) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      const updated = await CloudStorageService.updateCharacter(character.id, character);

      updateCurrentBook(book => ({
        ...book,
        characters: book.characters.map(c =>
          c.id === updated.id ? updated : c
        ),
      }));
      setSelectedCharacter(updated);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to update character:', error);
      setSaveStatus('error');
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      await CloudStorageService.deleteCharacter(id);

      updateCurrentBook(book => ({
        ...book,
        characters: book.characters.filter(c => c.id !== id),
      }));
      if (selectedCharacter?.id === id) {
        setSelectedCharacter(null);
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to delete character:', error);
      setSaveStatus('error');
    }
  };

  const handleAddChapter = async (chapter: Chapter) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      const payload: Omit<Chapter, 'id'> = {
        title: chapter.title,
        content: chapter.content,
        order: chapter.order,
        synopsis: chapter.synopsis,
        notes: chapter.notes,
        wordCount: chapter.wordCount,
        plotPoints: chapter.plotPoints,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      };

      const created = await CloudStorageService.createChapter(currentBook.id, payload);

      updateCurrentBook(book => ({
        ...book,
        chapters: [...book.chapters, created],
      }));
      setSelectedChapter(created);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to add chapter:', error);
      setSaveStatus('error');
    }
  };

  const handleUpdateChapter = async (chapter: Chapter) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      const updated = await CloudStorageService.updateChapter(chapter.id, chapter);

      updateCurrentBook(book => ({
        ...book,
        chapters: book.chapters.map(c =>
          c.id === updated.id ? updated : c
        ),
      }));
      setSelectedChapter(updated);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to update chapter:', error);
      setSaveStatus('error');
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    try {
      await CloudStorageService.deleteChapter(id);

      updateCurrentBook(book => ({
        ...book,
        chapters: book.chapters
          .filter(c => c.id !== id)
          .map((c, index) => ({ ...c, order: index })),
      }));
      if (selectedChapter?.id === id) {
        setSelectedChapter(null);
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      setSaveStatus('error');
    }
  };

  const handleUpdateMetadata = async (metadata: BookMetadata) => {
    if (!currentBook) return;

    setSaveStatus('saving');

    updateCurrentBook(book => ({
      ...book,
      metadata,
    }));

    try {
      await CloudStorageService.updateProject(currentBook.id, {
        metadata,
        settings: currentBook.settings,
      });
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to update metadata:', error);
      setSaveStatus('error');
    }
  };

  const handleSaveSettings = async (aiConfig: AIConfig) => {
    const sanitizedProvider = aiConfig.provider === 'none' ? undefined : aiConfig.provider;
    const sanitizedApiKey =
      sanitizedProvider && aiConfig.apiKey && aiConfig.apiKey.trim() ? aiConfig.apiKey.trim() : undefined;
    const sanitizedModel = aiConfig.model || 'gpt-4-turbo-preview';

    const nextAiConfig: AIConfig = {
      provider: aiConfig.provider,
      apiKey: sanitizedApiKey ?? '',
      model: sanitizedModel,
    };

    setAppData(prev => ({
      ...prev,
      aiConfig: nextAiConfig,
    }));

    initializeAI(sanitizedApiKey ?? '');

    if (!currentBook) return;

    setSaveStatus('saving');

    const settingsToSave = {
      aiProvider: sanitizedProvider,
      aiModel: sanitizedModel,
      aiApiKey: sanitizedApiKey,
    };

    // Debug: Log what we're saving
    console.log('Saving settings:', {
      projectId: currentBook.id,
      settings: settingsToSave,
      hasApiKey: !!sanitizedApiKey
    });

    try {
      await CloudStorageService.updateProject(currentBook.id, {
        metadata: currentBook.metadata,
        settings: settingsToSave,
      });

      // Verify the save by fetching the project again
      const updatedProject = await CloudStorageService.getProject(currentBook.id);
      console.log('Settings saved, verified:', {
        projectId: updatedProject.id,
        settings: updatedProject.settings,
        hasApiKey: !!updatedProject.settings?.aiApiKey
      });

      updateCurrentBook(book => ({
        ...book,
        settings: {
          aiProvider: sanitizedProvider,
          aiModel: sanitizedModel,
          aiApiKey: sanitizedApiKey,
        },
      }));
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    }
  };

  // Old AI Assistant handlers removed - now using unified AI Agent

  const renderContent = () => {
    if (!currentBook) {
      if (isLoadingBooks) {
        return (
          <div className="no-project">
            <h2>Loading your projects...</h2>
            <p>Please wait while we fetch your workspace.</p>
          </div>
        );
      }

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
              onStateChange={setCharacterState}
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
              onStateChange={setChapterState}
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
      <Sidebar
        view={view}
        onViewChange={setView}
        onLogout={user ? handleLogout : undefined}
        userName={user?.name}
      >
        <div className="project-switcher-container">
          <ProjectSwitcher
            books={appData.books}
            currentBook={currentBook}
            onSelectBook={handleSelectBook}
            onCreateBook={createNewBook}
            onOpenSettings={() => setShowSettings(true)}
            onOpenExport={() => setShowExport(true)}
          />
          <SaveStatus status={saveStatus} lastSaved={lastSaved} />
        </div>
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

      {/* Cursor-Style AI Agent - Collapsible Side Panel */}
      {currentBook && (
        <CursorAgent
          book={currentBook}
          activeView={view}
          currentChapter={selectedChapter}
          currentCharacter={selectedCharacter}
          chapterState={chapterState}
          characterState={characterState}
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
                characterArc: characterData.characterArc || selectedCharacter.characterArc,
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
