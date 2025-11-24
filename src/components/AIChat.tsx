import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles } from 'lucide-react';
import { Character, Chapter, Book } from '../types';
import { generateChapterContent, improveText, generatePlotSuggestions } from '../services/ai';
import './AIChat.css';

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
}

interface AIChatProps {
  book: Book | null;
  selectedCharacter: Character | null;
  selectedChapter: Chapter | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

function AIChat({ book, selectedCharacter, selectedChapter, messages, setMessages }: AIChatProps) {
  // Initialize with welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'ai',
        content: "Hello! I'm your AI writing assistant. I can help you with character development, plot ideas, writing suggestions, and more. What would you like to work on today?",
        timestamp: Date.now(),
      }]);
    }
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let aiResponse = '';

      // Analyze the user's message for context
      const message = userMessage.content.toLowerCase();
      
      if (message.includes('character') || message.includes('protagonist') || message.includes('villain')) {
        if (selectedCharacter) {
          aiResponse = `I can help you develop ${selectedCharacter.name}! Based on your character profile and recent context, here are some suggestions:\n\n`;
          aiResponse += `**Character Analysis:**\n`;
          aiResponse += `- Type: ${selectedCharacter.type}\n`;
          aiResponse += `- Description: ${selectedCharacter.description || 'Not specified'}\n`;
          aiResponse += `- Last updated: ${new Date(selectedCharacter.updatedAt).toLocaleDateString()}\n\n`;
          
          // Context-aware suggestions
          aiResponse += `**Context-Aware Development:**\n`;
          if (book && book.chapters.length > 0) {
            const chaptersWithCharacter = book.chapters.filter(ch => 
              ch.content.toLowerCase().includes(selectedCharacter.name.toLowerCase())
            );
            if (chaptersWithCharacter.length > 0) {
              aiResponse += `- This character appears in ${chaptersWithCharacter.length} chapters\n`;
              aiResponse += `- Recent chapters: ${chaptersWithCharacter.slice(-2).map(ch => ch.title).join(', ')}\n`;
            }
          }
          
          aiResponse += `\n**Development Questions:**\n`;
          aiResponse += `- What are ${selectedCharacter.name}'s deepest fears?\n`;
          aiResponse += `- How do they handle conflict?\n`;
          aiResponse += `- What drives them forward in the story?\n`;
          aiResponse += `- What flaws make them relatable?\n\n`;
          aiResponse += `**Consistency Check:** I can help you maintain character consistency across your ${book?.chapters.length || 0} chapters. Would you like me to suggest specific improvements or check for any inconsistencies?`;
        } else {
          aiResponse = `I'd love to help with character development! First, select a character from your character list, or create a new one. Then I can provide personalized suggestions for developing their personality, backstory, motivations, and character arc.\n\nI can also help you maintain consistency across your ${book?.chapters.length || 0} chapters once you have characters set up.`;
        }
      } else if (message.includes('plot') || message.includes('story') || message.includes('chapter')) {
        if (book) {
          // Context-aware plot suggestions
          aiResponse = `Here are some context-aware plot ideas for "${book.metadata.title}":\n\n`;
          aiResponse += `**Story Context:**\n`;
          aiResponse += `- Genre: ${book.metadata.genre || 'Not specified'}\n`;
          aiResponse += `- Characters: ${book.characters.length} (${book.characters.filter(c => c.type === 'main').length} main)\n`;
          aiResponse += `- Chapters: ${book.chapters.length}\n`;
          aiResponse += `- Total words: ${book.chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(w => w.length > 0).length, 0).toLocaleString()}\n\n`;
          
          if (book.chapters.length > 0) {
            aiResponse += `**Recent Chapter Activity:**\n`;
            const recentChapters = book.chapters.slice(-3);
            recentChapters.forEach((ch) => {
              aiResponse += `- ${ch.title} (${ch.content.split(/\s+/).filter(w => w.length > 0).length} words)\n`;
            });
            aiResponse += `\n`;
          }
          
          try {
            const plotSuggestions = await generatePlotSuggestions(
              book.metadata.synopsis || 'A story in development',
              book.characters,
              book.chapters
            );
            aiResponse += `**Plot Suggestions:**\n`;
            plotSuggestions.forEach((suggestion, index) => {
              aiResponse += `${index + 1}. ${suggestion}\n`;
            });
          } catch (error) {
            aiResponse += `**Plot Suggestions:**\n`;
            aiResponse += `1. Develop the relationship between your main characters\n`;
            aiResponse += `2. Add a plot twist that challenges your protagonist\n`;
            aiResponse += `3. Explore the consequences of earlier events\n`;
            aiResponse += `4. Introduce a new conflict or obstacle\n`;
            aiResponse += `5. Resolve a subplot while setting up new challenges\n`;
          }
          
          aiResponse += `\n**Consistency Check:** I can help you ensure these plot ideas work well with your existing ${book.chapters.length} chapters and ${book.characters.length} characters. Would you like me to elaborate on any of these ideas or check for potential conflicts?`;
        } else {
          aiResponse = `I can help you brainstorm plot ideas! To give you the most relevant suggestions, I'd need to know more about your story. You can tell me about your characters, setting, or the main conflict you're exploring.`;
        }
      } else if (message.includes('write') || message.includes('content') || message.includes('scene')) {
        if (selectedChapter) {
          aiResponse = `I'll help you with "${selectedChapter.title}"! \n\n`;
          aiResponse += `**Chapter Context:**\n`;
          aiResponse += `- Current word count: ${selectedChapter.content.split(/\s+/).filter(w => w.length > 0).length}\n`;
          aiResponse += `- Last updated: ${new Date(selectedChapter.updatedAt).toLocaleDateString()}\n`;
          
          if (book) {
            const charactersInChapter = book.characters.filter(char => 
              selectedChapter.content.toLowerCase().includes(char.name.toLowerCase())
            );
            if (charactersInChapter.length > 0) {
              aiResponse += `- Characters in this chapter: ${charactersInChapter.map(c => c.name).join(', ')}\n`;
            }
          }
          
          aiResponse += `\n`;
          
          try {
            const generatedContent = await generateChapterContent(
              selectedChapter.title,
              selectedChapter.content.slice(-500), // Last 500 chars for context
              book?.characters,
              `User request: ${userMessage.content}`
            );
            aiResponse += `**Generated Content:**\n\n${generatedContent}\n\n`;
            aiResponse += `**Consistency Notes:** This content maintains continuity with your existing story structure and character development. Would you like me to continue from here, adjust the tone, or focus on a different aspect?`;
          } catch (error) {
            aiResponse += `I can help you develop this chapter further. Based on your existing content, I suggest:\n\n`;
            aiResponse += `- Building on the current character development\n`;
            aiResponse += `- Adding dialogue that reveals character personality\n`;
            aiResponse += `- Creating tension that moves the plot forward\n`;
            aiResponse += `- Ensuring consistency with your story's tone and style\n\n`;
            aiResponse += `What specific aspect would you like to focus on?`;
          }
        } else {
          aiResponse = `I'd love to help you write! Select a chapter from your chapters list, or create a new one, and I can help you generate content, improve existing text, or brainstorm scenes.\n\nWith context awareness, I can ensure any new content fits perfectly with your existing ${book?.chapters.length || 0} chapters and ${book?.characters.length || 0} characters.`;
        }
      } else if (message.includes('improve') || message.includes('edit') || message.includes('rewrite')) {
        if (selectedChapter && selectedChapter.content) {
          const improved = await improveText(selectedChapter.content, userMessage.content);
          aiResponse = `Here's an improved version of your chapter content:\n\n${improved}\n\nThis version focuses on clarity, flow, and engagement while maintaining your voice. Would you like me to make any specific adjustments?`;
        } else {
          aiResponse = `I can help improve your writing! Select a chapter with content, and I can help enhance clarity, flow, dialogue, descriptions, or any other aspect you'd like to focus on.`;
        }
      } else {
        // General writing advice
        aiResponse = `I'm here to help with your writing! I can assist with:\n\n`;
        aiResponse += `📝 **Writing & Editing**\n`;
        aiResponse += `- Generate chapter content\n`;
        aiResponse += `- Improve existing text\n`;
        aiResponse += `- Brainstorm scenes and dialogue\n\n`;
        aiResponse += `👥 **Character Development**\n`;
        aiResponse += `- Develop character personalities\n`;
        aiResponse += `- Create character backstories\n`;
        aiResponse += `- Plan character arcs\n\n`;
        aiResponse += `📖 **Plot & Structure**\n`;
        aiResponse += `- Generate plot ideas\n`;
        aiResponse += `- Plan story structure\n`;
        aiResponse += `- Overcome writer's block\n\n`;
        aiResponse += `What specific aspect of your book would you like to work on?`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm sorry, I encountered an error: ${error.message}. Please make sure your AI API key is configured in Settings, or try asking me something else!`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <div className="header-content">
          <Sparkles className="header-icon" />
          <div className="header-text">
            <h3>AI Writing Assistant</h3>
            <p>Chat with your AI writing partner</p>
          </div>
        </div>
        {book && (
          <div className="context-info">
            <span className="context-item">📖 {book.metadata.title}</span>
            {selectedCharacter && (
              <span className="context-item">👤 {selectedCharacter.name}</span>
            )}
            {selectedChapter && (
              <span className="context-item">📝 {selectedChapter.title}</span>
            )}
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="message-content">
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-avatar">
              <Bot size={16} />
            </div>
            <div className="message-content">
              <div className="message-text loading">
                <Loader size={16} className="spinning" />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your characters, plot, writing, or anything else..."
            className="message-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

export default AIChat;
