import OpenAI from 'openai';
import { Character, Chapter } from '../types';

let openaiClient: OpenAI | null = null;

export function initializeAI(apiKey: string) {
  if (apiKey && apiKey.trim()) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, API calls should go through backend
    });
  } else {
    openaiClient = null;
  }
}

export function isAIConfigured(): boolean {
  return openaiClient !== null;
}

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): Promise<string> {
  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI writing assistant. Help the user with their creative writing, character development, plot ideas, and story structure.',
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    return content;
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw error;
  }
}

export async function generateCharacter(
  type: 'main' | 'secondary' | 'tertiary',
  context?: string
): Promise<Partial<Character>> {
  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const prompt = `Generate a ${type} character for a novel. ${context ? `Context: ${context}` : ''}
  
Return a JSON object with:
- name: character's full name
- description: a brief 1-2 sentence description
- biography: a detailed 2-3 paragraph biography including background, personality, motivations, and conflicts
- age: character's age (number)
- role: their role in the story

Make the character compelling, unique, and well-developed.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writing assistant specializing in character development. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content);
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}

export async function generateChapterContent(
  chapterTitle: string,
  previousContent?: string,
  characters?: Character[],
  plotContext?: string
): Promise<string> {
  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const characterContext = characters
    ? `\n\nCharacters:\n${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    : '';

  const prompt = `Write compelling content for a book chapter titled "${chapterTitle}".
${previousContent ? `\n\nPrevious context:\n${previousContent.slice(-500)}` : ''}
${characterContext}
${plotContext ? `\n\nPlot context: ${plotContext}` : ''}

Write 2-3 paragraphs of engaging narrative that advances the story. Focus on vivid descriptions, character development, and compelling dialogue.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional fiction writer with expertise in narrative construction, character development, and engaging prose.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}

export async function improveText(text: string, instruction?: string): Promise<string> {
  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const prompt = instruction
    ? `${instruction}\n\nText to improve:\n${text}`
    : `Improve the following text by enhancing clarity, flow, and engagement while maintaining the author's voice:\n\n${text}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert editor helping improve creative writing.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}

export async function generatePlotSuggestions(
  bookContext: string,
  characters: Character[],
  existingChapters: Chapter[]
): Promise<string[]> {
  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const characterList = characters.map(c => `${c.name} (${c.type}): ${c.description}`).join('\n');
  const chapterSummary = existingChapters.map((ch, i) => `Chapter ${i + 1}: ${ch.title}`).join('\n');

  const prompt = `Given this book context:

${bookContext}

Characters:
${characterList}

Existing chapters:
${chapterSummary}

Suggest 5 compelling plot developments or story directions. Return as a JSON array of strings.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a story consultant helping develop engaging plots. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    const parsed = JSON.parse(content);
    return parsed.suggestions || parsed.plots || Object.values(parsed);
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}


