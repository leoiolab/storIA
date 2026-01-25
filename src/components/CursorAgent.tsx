import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Sparkles, X, RefreshCw, Copy, Check, ChevronRight, FileText, Users, BookOpen } from 'lucide-react';
import { Book, Character, Chapter, AIConfig } from '../types';
import type { View } from './Sidebar';
import type { EntityState } from './CharacterEditor';
import { chatWithAI, isAIConfigured } from '../services/ai';
import './CursorAgent.css';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  context?: {
    type: 'chapter' | 'character' | 'book';
    name: string;
  };
  actions?: Array<{
    type: 'create-character' | 'update-character' | 'insert-text' | 'update-chapter';
    label: string;
    data: any;
  }>;
}

const buildContextSummary = (
  book: Book,
  activeView: View,
  currentChapter?: Chapter | null,
  currentCharacter?: Character | null,
  chapterState?: EntityState,
  characterState?: EntityState
) => {
  const sections: string[] = [];

  sections.push(`Book: "${book.metadata.title}" by ${book.metadata.author || 'Unknown author'}`);

  if (book.metadata.synopsis) {
    sections.push(`Synopsis: ${book.metadata.synopsis}`);
  }

  if (activeView === 'metadata') {
    sections.push('User is editing the book metadata (title, author, genre, synopsis, targets). Focus suggestions on overall story planning.');
  }

  if (currentChapter) {
    const chapterSection: string[] = [
      `Focused Chapter: "${currentChapter.title}" (order ${currentChapter.order + 1})`
    ];
    if (chapterState) {
      chapterSection.push(`Chapter State: ${chapterState === 'new' ? 'NEW - Being created for the first time' : chapterState === 'locked' ? 'LOCKED - Cannot be edited' : 'EDIT - Currently being edited'}`);
    }
    if (currentChapter.synopsis) {
      chapterSection.push(`Chapter Synopsis: ${currentChapter.synopsis}`);
    }
    if (currentChapter.notes) {
      chapterSection.push(`Author Notes: ${currentChapter.notes}`);
    }
    
    // Include chapter content - prefer sections if available, otherwise use legacy content
    if (currentChapter.sections && currentChapter.sections.length > 0) {
      const sortedSections = [...currentChapter.sections].sort((a, b) => a.order - b.order);
      const sectionsContent = sortedSections
        .map((section, index) => {
          return `Section ${index + 1}: "${section.title}"\n${section.content}`;
        })
        .join('\n\n---\n\n');
      chapterSection.push(`Chapter Content (${sortedSections.length} section${sortedSections.length !== 1 ? 's' : ''}):\n\n${sectionsContent}`);
    } else if (currentChapter.content) {
      chapterSection.push(`Chapter Content:\n${currentChapter.content}`);
    }
    
    sections.push(chapterSection.join('\n'));
  } else if (activeView === 'chapters' && book.chapters.length) {
    const preview = book.chapters
      .slice(0, 5)
      .map(chapter => `"${chapter.title}"`)
      .join(', ');
    sections.push(`User is browsing chapters. Current roster: ${preview}${book.chapters.length > 5 ? ', ...' : ''}`);
  }

  if (currentCharacter) {
    const arcSnippet = currentCharacter.characterArc ? `\nCharacter Arc: ${currentCharacter.characterArc}` : '';
    const stateInfo = characterState ? `\nCharacter State: ${characterState === 'new' ? 'NEW - Being created for the first time' : characterState === 'locked' ? 'LOCKED - Cannot be edited' : 'EDIT - Currently being edited'}` : '';
    sections.push(
      [
        `Focused Character: ${currentCharacter.name} (${currentCharacter.type})`,
        stateInfo || null,
        currentCharacter.description ? `Description: ${currentCharacter.description}` : null,
        arcSnippet || null,
      ]
        .filter(Boolean)
        .join('\n')
    );
  } else if (activeView === 'characters' && book.characters.length) {
    const listPreview = book.characters
      .slice(0, 6)
      .map(char => `${char.name} (${char.type})`)
      .join(', ');
    sections.push(`User is reviewing the character roster. Characters available: ${listPreview}${book.characters.length > 6 ? ', ...' : ''}`);
  }

  if (activeView === 'relationships') {
    sections.push('User is analysing relationships between characters. Highlight connections and dynamics.');
  }

  if (activeView === 'storyarc') {
    sections.push('User is working on the story arc. Provide structural guidance across beginning, middle, and end.');
  }

  if (activeView === 'reader') {
    sections.push('User is in reader mode, focusing on narrative flow and pacing.');
  }

  const mainCharacters = book.characters.filter(c => c.type === 'main').map(c => c.name);
  if (mainCharacters.length > 0) {
    sections.push(`Main Characters: ${mainCharacters.join(', ')}`);
  }

  return sections.join('\n\n');
};

interface CursorAgentProps {
  book: Book;
  activeView: View;
  currentChapter?: Chapter | null;
  currentCharacter?: Character | null;
  chapterState?: EntityState;
  characterState?: EntityState;
  messages: AgentMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>;
  onInsertText?: (text: string) => void;
  onCreateCharacter?: (characterData: Partial<Character>) => void;
  onUpdateCharacter?: (characterData: Partial<Character>) => void;
  onUpdateChapter?: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
  aiConfig?: AIConfig;
}

function CursorAgent({
  book,
  activeView,
  currentChapter,
  currentCharacter,
  chapterState,
  characterState,
  messages,
  setMessages,
  onInsertText,
  onCreateCharacter,
  onUpdateCharacter,
  onUpdateChapter,
  isOpen,
  onClose,
  aiConfig
}: CursorAgentProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const contextSummary = useMemo(
    () => buildContextSummary(book, activeView, currentChapter, currentCharacter, chapterState, characterState),
    [book, activeView, currentChapter, currentCharacter, chapterState, characterState]
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check if AI is configured
    if (!isAIConfigured()) {
      const errorMessage: AgentMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ AI is not configured. Please go to Settings and add your OpenAI API key to enable AI features.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const messageTimestamp = Date.now();
    const outgoingMessage: AgentMessage = {
      id: messageTimestamp.toString(),
      role: 'user',
      content: input.trim(),
      timestamp: messageTimestamp,
      context: currentChapter
        ? { type: 'chapter', name: currentChapter.title }
        : currentCharacter
          ? { type: 'character', name: currentCharacter.name }
          : undefined
    };

    setMessages(prev => [...prev, outgoingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context for AI
      const userPrompt = outgoingMessage.content;
      
      // Detect what the user wants
      const wantsCharacter = /create|generate|make.*character|new character/i.test(userPrompt);
      const wantsContent = /write|continue|generate.*content|next paragraph/i.test(userPrompt);
      const wantsDialogue = /dialogue|dialog|conversation/i.test(userPrompt);
      const wantsMinorUpdate = /minor update/i.test(userPrompt);
      const wantsMajorUpdate = /major update/i.test(userPrompt);
      const wantsModification = /update|add|remove|delete|change|modify|edit|rewrite|improve|enhance|refine|fix|adjust|revise/i.test(userPrompt);
      
      let enhancedPrompt = userPrompt;
      // Build duplicate checking info
      const existingCharacterNames = book.characters.map(c => c.name.toLowerCase().trim());
      const existingChapterTitles = book.chapters.map(c => c.title.toLowerCase().trim());
      
      let duplicateWarning = '';
      if (characterState === 'new' && currentCharacter) {
        const currentName = currentCharacter.name.toLowerCase().trim();
        if (existingCharacterNames.includes(currentName)) {
          duplicateWarning = `\n\n⚠️ WARNING: A character named "${currentCharacter.name}" already exists in this book. Do NOT create a duplicate. Instead, suggest updating the existing character or using a different name.`;
        }
      }
      if (chapterState === 'new' && currentChapter) {
        const currentTitle = currentChapter.title.toLowerCase().trim();
        if (existingChapterTitles.includes(currentTitle)) {
          duplicateWarning = `\n\n⚠️ WARNING: A chapter titled "${currentChapter.title}" already exists in this book. Do NOT create a duplicate. Instead, suggest updating the existing chapter or using a different title.`;
        }
      }
      
      let systemPrompt = `You are an intelligent AI writing assistant with full context of the user's book.

${contextSummary}

IMPORTANT RULES:
1. If the character/chapter state is "NEW", check if a character/chapter with the same name/title already exists before creating.
2. If the character/chapter state is "LOCKED", you CANNOT make changes - inform the user they need to unlock it first.
3. If the character/chapter state is "EDIT", you can suggest updates and improvements.
4. Existing characters: ${book.characters.map(c => c.name).join(', ')}
5. Existing chapters: ${book.chapters.map(c => c.title).join(', ')}
${duplicateWarning}

Help the user with character development, plot ideas, writing suggestions, dialogue, and any creative writing needs. Be specific and helpful, considering the context of their story.`;

      // Add special instructions for actionable requests
      if (wantsCharacter) {
        enhancedPrompt += `\n\nIMPORTANT: After explaining your ideas, you MUST include a JSON code block with the complete character details in this EXACT format:

\`\`\`json
{
  "name": "Full Character Name",
  "type": "main",
  "quickDescription": "A compelling one-sentence description of the character",
  "fullBio": "A detailed 2-3 paragraph biography including their background, personality, motivations, conflicts, and role in the story",
  "age": "25",
  "role": "Protagonist / Detective / etc"
}
\`\`\`

Make sure quickDescription is ONE sentence and fullBio is MULTIPLE detailed paragraphs.`;
      } else if (wantsMinorUpdate && currentCharacter) {
        enhancedPrompt += `\n\nCurrent character data:
- Name: ${currentCharacter.name}
- Description: ${currentCharacter.description}
- Biography: ${currentCharacter.biography}
- Age: ${currentCharacter.age || 'Not specified'}
- Role: ${currentCharacter.role || 'Not specified'}

IMPORTANT: Provide ONLY the improved/refined version in a JSON code block. Make subtle improvements - fix grammar, enhance descriptions, add small details, clarify traits. Keep the core character intact.

\`\`\`json
{
  "name": "${currentCharacter.name}",
  "type": "${currentCharacter.type}",
  "quickDescription": "Improved one-sentence description",
  "fullBio": "Enhanced biography with small refinements",
  "age": "${currentCharacter.age || ''}",
  "role": "${currentCharacter.role || ''}"
}
\`\`\``;
      } else if (wantsMajorUpdate && currentCharacter) {
        enhancedPrompt += `\n\nCurrent character data:
- Name: ${currentCharacter.name}
- Description: ${currentCharacter.description}
- Biography: ${currentCharacter.biography}
- Age: ${currentCharacter.age || 'Not specified'}
- Role: ${currentCharacter.role || 'Not specified'}

IMPORTANT: Provide a comprehensive rewrite in a JSON code block. Significantly expand the biography, deepen motivations, add complexity, develop character arcs, enhance backstory.

\`\`\`json
{
  "name": "${currentCharacter.name}",
  "type": "${currentCharacter.type}",
  "quickDescription": "Compelling new one-sentence description",
  "fullBio": "Deeply developed 3-5 paragraph biography with rich details, complex motivations, internal conflicts, relationships, and character arc",
  "age": "${currentCharacter.age || ''}",
  "role": "${currentCharacter.role || ''}"
}
\`\`\``;
      } else if (wantsModification && currentCharacter && !wantsMinorUpdate && !wantsMajorUpdate) {
        // User wants to modify current character (add, change, remove, etc.)
        enhancedPrompt += `\n\nCurrent character data:
- Name: ${currentCharacter.name}
- Type: ${currentCharacter.type}
- Description: ${currentCharacter.description || 'Not set'}
- Biography: ${currentCharacter.biography || 'Not set'}
- Age: ${currentCharacter.age || 'Not specified'}
- Role: ${currentCharacter.role || 'Not specified'}

IMPORTANT: Apply the requested modification to the character and return the COMPLETE updated character data in a JSON code block with ALL fields (not just the changed ones):

\`\`\`json
{
  "name": "${currentCharacter.name}",
  "type": "${currentCharacter.type}",
  "quickDescription": "Updated description incorporating the changes",
  "fullBio": "Updated biography incorporating the changes",
  "age": "Updated or current age",
  "role": "Updated or current role"
}
\`\`\`

Make sure to include ALL fields in the JSON, even if they weren't modified.`;
      } else if (wantsMinorUpdate && currentChapter) {
        const chapterContent = currentChapter.sections && currentChapter.sections.length > 0
          ? currentChapter.sections
              .sort((a, b) => a.order - b.order)
              .map((s, i) => `Section ${i + 1}: "${s.title}"\n${s.content}`)
              .join('\n\n---\n\n')
          : currentChapter.content || '';
        
        enhancedPrompt += `\n\nCurrent chapter content:
${chapterContent}

IMPORTANT: Provide the polished version of the chapter. Fix grammar, enhance prose, improve flow, refine descriptions. Keep the structure and plot intact.`;
      } else if (wantsMajorUpdate && currentChapter) {
        const chapterContent = currentChapter.sections && currentChapter.sections.length > 0
          ? currentChapter.sections
              .sort((a, b) => a.order - b.order)
              .map((s, i) => `Section ${i + 1}: "${s.title}"\n${s.content}`)
              .join('\n\n---\n\n')
          : currentChapter.content || '';
        
        enhancedPrompt += `\n\nCurrent chapter content:
${chapterContent}

IMPORTANT: Provide a significantly improved version. Rewrite sections for better impact, develop scenes more deeply, add tension, enhance character moments, improve pacing.`;
      } else if (wantsModification && currentChapter && !wantsMinorUpdate && !wantsMajorUpdate) {
        // User wants to modify current chapter
        const chapterContent = currentChapter.sections && currentChapter.sections.length > 0
          ? currentChapter.sections
              .sort((a, b) => a.order - b.order)
              .map((s, i) => `Section ${i + 1}: "${s.title}"\n${s.content}`)
              .join('\n\n---\n\n')
          : currentChapter.content || '';
        
        enhancedPrompt += `\n\nCurrent chapter content:
${chapterContent}

IMPORTANT: Apply the requested modification and provide the updated chapter content.`;
      } else if (wantsContent || wantsDialogue) {
        enhancedPrompt += `\n\nIMPORTANT: Provide the actual content/dialogue that can be inserted directly into the chapter.`;
      }

      // Get conversation history
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // Add current message
      conversationHistory.push({
        role: 'user',
        content: enhancedPrompt
      });

      // Call AI
      const model = aiConfig?.model || 'gpt-4-turbo-preview';
      const aiResponse = await chatWithAI(conversationHistory, systemPrompt, model);
      console.log('AI Response received:', aiResponse);

      // Parse response for actionable content
      const actions = parseResponseActions(aiResponse, userPrompt);
      console.log('Parsed actions:', actions);

      const aiMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        actions,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Failed to get AI response'}. Please check your API key in Settings.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse AI response for actionable content
  const parseResponseActions = (response: string, userPrompt: string) => {
    const actions: Array<{
      type: 'create-character' | 'update-character' | 'insert-text' | 'update-chapter';
      label: string;
      data: any;
    }> = [];

    // Try to extract JSON character data - be more flexible with JSON matching
    const jsonPatterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/,
      /```\s*(\{[\s\S]*?\})\s*```/,
      /\{[\s\S]*?"name"[\s\S]*?\}/  // Fallback: look for any JSON object with "name"
    ];
    
    let characterData = null;
    for (const pattern of jsonPatterns) {
      const match = response.match(pattern);
      if (match) {
        try {
          const parsed = JSON.parse(match[1] || match[0]);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            characterData = parsed;
            break;
          }
        } catch (e) {
          // Try next pattern
          continue;
        }
      }
    }
    
    if (characterData) {
      console.log('Parsed character data from AI:', characterData);
      
      // Normalize field names
      const normalizedData = {
        name: characterData.name,
        type: characterData.type || 'secondary',
        quickDescription: characterData.quickDescription || characterData.description || '',
        fullBio: characterData.fullBio || characterData.biography || characterData.bio || '',
        age: characterData.age,
        role: characterData.role,
        characterArc: characterData.characterArc || '',
      };
      
      console.log('Normalized character data:', normalizedData);
      
      if (normalizedData.name) {
        // Determine if this is a new character or an update - be more lenient
        const promptLower = userPrompt.toLowerCase();
        const isUpdateRequest = /update|improve|refine|enhance|modify|edit|change|revise|adjust/i.test(promptLower);
        
        const isNewCharacterRequest = /create|new character|add character|make.*character/i.test(promptLower) && !isUpdateRequest;
        
        // If we have a current character and it's not explicitly a new character request, it's an update
        const shouldUpdate = (currentCharacter && !isNewCharacterRequest) || isUpdateRequest;
        
        console.log('Action detection:', { isUpdateRequest, isNewCharacterRequest, shouldUpdate, hasCurrentCharacter: !!currentCharacter });
        
        actions.push({
          type: shouldUpdate ? 'update-character' : 'create-character',
          label: shouldUpdate ? '📝 Update Character' : '✨ Create Character',
          data: normalizedData
        });
      }
    }

    // Check if response contains chapter updates (minor/major) - be more flexible
    const isChapterUpdate = /minor update|major update|improve.*chapter|enhance.*chapter|refine.*chapter/i.test(userPrompt);
    if (isChapterUpdate && currentChapter) {
      // For chapter updates, extract the improved content
      // Look for code blocks or substantial text - try multiple patterns
      const codeBlockPatterns = [
        /```(?:markdown|text)?\s*([\s\S]+?)\s*```/,
        /```\s*([\s\S]+?)\s*```/,
      ];
      
      let improvedContent = null;
      for (const pattern of codeBlockPatterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          const content = match[1].trim();
          if (content.length > 100) {
            improvedContent = content;
            break;
          }
        }
      }
      
      // If no code block, try to extract the main content after explanations
      if (!improvedContent) {
        const contentMatch = response.match(/(?:Here(?:'s| is)|Updated|Improved|Revised)[\s\S]*?:\s*([\s\S]+?)(?:\n\n(?:Would you|Let me|What do|Is there)|$)/i);
        if (contentMatch && contentMatch[1] && contentMatch[1].trim().length > 100) {
          improvedContent = contentMatch[1].trim();
        }
      }
      
      // Last resort: use the full response if it's substantial
      if (!improvedContent && response.length > 200 && !response.includes('```json')) {
        // Remove common AI explanations
        const cleaned = response
          .replace(/^(Here's|Here is|Updated|Improved|Revised)[\s\S]*?:\s*/i, '')
          .replace(/\n\n(Would you|Let me|What do|Is there)[\s\S]*$/i, '')
          .trim();
        if (cleaned.length > 100) {
          improvedContent = cleaned;
        }
      }
      
      if (improvedContent) {
        const isMinor = /minor/i.test(userPrompt);
        actions.push({
          type: 'update-chapter',
          label: isMinor ? '🔧 Apply Minor Updates' : '🔨 Apply Major Updates',
          data: improvedContent
        });
      }
    }
    
    // Check if response contains story content to insert - be more lenient
    const hasContent = /write|continue|generate.*content|next paragraph|insert|add.*text|story|dialogue|scene/i.test(userPrompt);
    if (hasContent && currentChapter && !isChapterUpdate) {
      // Extract clean content (remove explanations) - try multiple patterns
      const contentPatterns = [
        /(?:Here(?:'s| is)|^)([\s\S]+?)(?:\n\n(?:Would you like|Let me know|What do you think|Is there anything|Would you want)|$)/i,
        /```(?:markdown|text)?\s*([\s\S]+?)\s*```/,
        /^([\s\S]+?)(?:\n\n(?:Would you|Let me|What do|Is there|I hope|Enjoy)[\s\S]*$)/i,
      ];
      
      let content = null;
      for (const pattern of contentPatterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          const extracted = match[1].trim();
          if (extracted.length > 50 && !extracted.includes('```json')) {
            content = extracted;
            break;
          }
        }
      }
      
      // Fallback: use response if it's substantial and doesn't look like JSON
      if (!content && response.length > 100 && !response.includes('```json') && !response.match(/^\s*\{/)) {
        // Remove common AI explanations
        const cleaned = response
          .replace(/^(Here's|Here is|I've|I have)[\s\S]*?:\s*/i, '')
          .replace(/\n\n(Would you|Let me|What do|Is there|I hope|Enjoy)[\s\S]*$/i, '')
          .trim();
        if (cleaned.length > 50) {
          content = cleaned;
        }
      }
      
      if (content) {
        actions.push({
          type: 'insert-text',
          label: '📝 Insert into Chapter',
          data: content
        });
      }
    }

    return actions.length > 0 ? actions : undefined;
  };

  // Execute actions
  const handleAction = (action: { type: string; data: any }) => {
    console.log('Executing action:', action.type);
    
    // Log details for character actions
    if (action.type === 'create-character' || action.type === 'update-character') {
      console.log('Character data:', {
        name: action.data.name,
        quickDescription: action.data.quickDescription,
        fullBio: action.data.fullBio,
        type: action.data.type,
        age: action.data.age,
        role: action.data.role
      });
    }
    
    switch (action.type) {
      case 'create-character':
        if (onCreateCharacter) {
          console.log('Calling onCreateCharacter with data:', action.data);
          onCreateCharacter(action.data);
          // Add confirmation message
          const confirmMsg: AgentMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Character "${action.data.name}" has been created! You can find them in the Characters tab.`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, confirmMsg]);
        } else {
          console.error('onCreateCharacter handler not provided');
        }
        break;
      
      case 'update-character':
        if (onUpdateCharacter && currentCharacter) {
          onUpdateCharacter({ ...currentCharacter, ...action.data });
          const confirmMsg: AgentMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Character "${currentCharacter.name}" has been updated!`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, confirmMsg]);
        }
        break;
      
      case 'insert-text':
        if (onInsertText) {
          onInsertText(action.data);
          const confirmMsg: AgentMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Content inserted into "${currentChapter?.title}"!`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, confirmMsg]);
        }
        break;
      
      case 'update-chapter':
        if (currentChapter && onUpdateChapter) {
          onUpdateChapter(action.data);
          const confirmMsg: AgentMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Chapter "${currentChapter.title}" has been updated! The improved content is now in your editor.`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, confirmMsg]);
        }
        break;
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (confirm('Clear all conversation history?')) {
      setMessages([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cursor-agent">
      {/* Header */}
      <div className="agent-header">
        <div className="agent-title">
          <Sparkles size={18} />
          <span>ASI</span>
        </div>
        <div className="agent-actions">
          <button
            className="agent-action-btn"
            onClick={handleClearChat}
            title="Clear conversation"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="agent-action-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Context Bar */}
      <div className="agent-context">
        <div className="context-item">
          <FileText size={14} />
          <span>{book.metadata.title}</span>
        </div>
        {currentChapter && (
          <div className="context-item">
            <ChevronRight size={12} />
            <BookOpen size={14} />
            <span>{currentChapter.title}</span>
          </div>
        )}
        {currentCharacter && (
          <div className="context-item">
            <ChevronRight size={12} />
            <Users size={14} />
            <span>{currentCharacter.name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="agent-messages">
        {messages.length === 0 && (
          <div className="agent-welcome">
            <Sparkles size={48} />
            <h3>AI Writing Agent</h3>
            <p>I'm your intelligent writing assistant with full context of your book.</p>
            <div className="agent-suggestions">
              {currentCharacter ? (
                <>
                  <button onClick={() => setInput(`Make minor updates to ${currentCharacter.name} - refine description, add small details, or clarify traits`)}>
                    🔧 Minor Update
                  </button>
                  <button onClick={() => setInput(`Make major updates to ${currentCharacter.name} - comprehensive rewrite of biography, motivations, and character development`)}>
                    🔨 Major Update
                  </button>
                  <button onClick={() => setInput(`Generate a detailed backstory for ${currentCharacter.name}`)}>
                    📖 Create backstory
                  </button>
                  <button onClick={() => setInput(`Write dialogue for ${currentCharacter.name} in this scene`)}>
                    💬 Generate dialogue
                  </button>
                </>
              ) : currentChapter ? (
                <>
                  <button onClick={() => setInput(`Make minor updates to "${currentChapter.title}" - polish prose, fix grammar, enhance descriptions, improve flow`)}>
                    🔧 Minor Update
                  </button>
                  <button onClick={() => setInput(`Make major updates to "${currentChapter.title}" - rewrite sections, restructure plot, develop scenes more deeply, add new content`)}>
                    🔨 Major Update
                  </button>
                  <button onClick={() => setInput('Continue writing from where I left off')}>
                    ✍️ Continue chapter
                  </button>
                  <button onClick={() => setInput('Improve the pacing and flow of this chapter')}>
                    ⚡ Improve pacing
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setInput('Help me outline the next chapter')}>
                    📋 Outline chapter
                  </button>
                  <button onClick={() => setInput('Suggest character development ideas')}>
                    👥 Character ideas
                  </button>
                  <button onClick={() => setInput('Generate plot twist ideas')}>
                    🎭 Plot twists
                  </button>
                  <button onClick={() => setInput('Help me with story structure and pacing')}>
                    📊 Story structure
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`agent-message ${message.role}`}>
            <div className="message-icon">
              {message.role === 'user' ? (
                <div className="user-avatar">You</div>
              ) : (
                <Sparkles size={16} />
              )}
            </div>
            <div className="message-content">
              {message.context && (
                <div className="message-context">
                  Context: {message.context.type} - {message.context.name}
                </div>
              )}
              <div className="message-text">{message.content}</div>
              {message.role === 'assistant' && (
                <div className="message-actions">
                  {/* Smart Action Buttons */}
                  {message.actions && message.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action)}
                      className="message-action action-primary"
                    >
                      {action.label}
                    </button>
                  ))}
                  
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="message-action"
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="agent-message assistant">
            <div className="message-icon">
              <Sparkles size={16} className="loading-spinner" />
            </div>
            <div className="message-content">
              <div className="message-text loading">Thinking...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="agent-input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your story... (Shift+Enter for new line)"
          className="agent-input"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="agent-send"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Tips */}
      <div className="agent-tips">
        <span>Tip: I have full context of your book, characters, and current chapter</span>
      </div>
    </div>
  );
}

export default CursorAgent;

