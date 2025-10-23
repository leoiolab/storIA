import { useState } from 'react';
import { Sparkles, Loader, AlertCircle } from 'lucide-react';
import { Character } from '../types';
import { generateCharacter, generateChapterContent, improveText, generatePlotSuggestions } from '../services/ai';
import './AIAssistant.css';

interface AIAssistantProps {
  type: 'character' | 'chapter' | 'improve' | 'plot';
  onGenerate?: (data: any) => void;
  context?: {
    characters?: Character[];
    previousContent?: string;
    text?: string;
    bookContext?: string;
    chapterTitle?: string;
    characterType?: 'main' | 'secondary' | 'tertiary';
  };
}

function AIAssistant({ type, onGenerate, context = {} }: AIAssistantProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let result;

      switch (type) {
        case 'character':
          result = await generateCharacter(
            context.characterType || 'main',
            customPrompt
          );
          break;

        case 'chapter':
          result = await generateChapterContent(
            context.chapterTitle || 'New Chapter',
            context.previousContent,
            context.characters,
            customPrompt
          );
          break;

        case 'improve':
          if (!context.text) throw new Error('No text provided');
          result = await improveText(context.text, customPrompt);
          break;

        case 'plot':
          result = await generatePlotSuggestions(
            context.bookContext || '',
            context.characters || [],
            []
          );
          break;
      }

      if (onGenerate) {
        onGenerate(result);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'character': return 'AI Character Generator';
      case 'chapter': return 'AI Writing Assistant';
      case 'improve': return 'Improve Text';
      case 'plot': return 'Plot Suggestions';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'character': return 'Generate a detailed character with AI';
      case 'chapter': return 'Generate chapter content based on your story';
      case 'improve': return 'Enhance your text with AI suggestions';
      case 'plot': return 'Get AI-generated plot ideas';
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <Sparkles size={18} className="ai-icon" />
        <div className="ai-header-text">
          <h4>{getTitle()}</h4>
          <p>{getDescription()}</p>
        </div>
      </div>

      <div className="ai-content">
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Add optional instructions or context..."
          className="ai-prompt-input"
          rows={3}
        />

        {error && (
          <div className="ai-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="ai-generate-button"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader size={16} className="spinning" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default AIAssistant;



