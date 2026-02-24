import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Character, Chapter } from '../types';

type AIProvider = 'openai' | 'anthropic' | 'none';

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let currentProvider: AIProvider = 'none';

export function initializeAI(apiKey: string, provider: AIProvider = 'openai') {
  currentProvider = provider;
  openaiClient = null;
  anthropicClient = null;

  if (!apiKey?.trim() || provider === 'none') {
    return;
  }

  if (provider === 'openai') {
    openaiClient = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true,
    });
  } else if (provider === 'anthropic') {
    anthropicClient = new Anthropic({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true,
    });
  }
}

export function isAIConfigured(): boolean {
  return openaiClient !== null || anthropicClient !== null;
}

function isAnthropic(): boolean {
  return currentProvider === 'anthropic' && anthropicClient !== null;
}

async function chatWithAnthropic(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string | undefined,
  model: string,
  maxTokens: number = 4096
): Promise<string> {
  if (!anthropicClient) throw new Error('AI not configured. Please add your API key in settings.');

  const system = systemPrompt || 'You are a helpful AI writing assistant. Help the user with their creative writing, character development, plot ideas, and story structure.';

  const anthropicMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await anthropicClient.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: anthropicMessages,
  });

  const textBlock = response.content?.find((b) => b.type === 'text');
  if (!textBlock || typeof (textBlock as { text?: string }).text !== 'string') throw new Error('No response from AI');
  return (textBlock as { text: string }).text;
}

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string,
  model: string = 'gpt-4-turbo-preview'
): Promise<string> {
  if (isAnthropic()) {
    try {
      return await chatWithAnthropic(messages, systemPrompt, model, 4096);
    } catch (error) {
      console.error('AI Chat Error:', error);
      throw error;
    }
  }

  if (!openaiClient) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: model,
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
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    return content;
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw error;
  }
}

/**
 * Enhances a short user prompt into a clear, detailed instruction for the writing assistant.
 */
export async function enhancePromptForWriting(
  userPrompt: string,
  bookTitle: string,
  model: string = 'gpt-4-turbo-preview'
): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }
  if (!userPrompt?.trim()) return userPrompt;

  const systemPrompt = `You are a prompt refiner for a novel-writing app. The user has typed a short instruction for an AI writing assistant. Your job is to rewrite it as a single, clear, detailed instruction that preserves their intent but adds structure and specificity so the writing assistant can respond better. Include relevant context (e.g. "for this chapter", "in character voice") only if it fits. Reply with ONLY the enhanced instruction—no preamble, no "Here's the enhanced prompt", no quotes.`;

  const userMessage = `Book: "${bookTitle}". User's instruction: ${userPrompt.trim()}`;

  if (isAnthropic()) {
    try {
      const out = await chatWithAnthropic(
        [{ role: 'user', content: userMessage }],
        systemPrompt,
        model,
        500
      );
      return out.trim() || userPrompt;
    } catch (error) {
      console.error('Prompt enhance error:', error);
      throw error;
    }
  }

  try {
    const response = await openaiClient!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });
    const content = response.choices[0].message.content?.trim();
    return content || userPrompt;
  } catch (error) {
    console.error('Prompt enhance error:', error);
    throw error;
  }
}

export async function generateCharacter(
  type: 'main' | 'secondary' | 'tertiary',
  context?: string,
  model: string = 'gpt-4-turbo-preview'
): Promise<Partial<Character>> {
  if (!isAIConfigured()) {
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

  const systemPrompt = 'You are a creative writing assistant specializing in character development. Always return valid JSON only, no markdown or explanation.';

  if (isAnthropic()) {
    try {
      const text = await chatWithAnthropic(
        [{ role: 'user', content: prompt }],
        systemPrompt,
        model,
        2048
      );
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('AI Error:', error);
      throw error;
    }
  }

  try {
    const response = await openaiClient!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
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
  plotContext?: string,
  model: string = 'gpt-4-turbo-preview'
): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const characterContext = characters
    ? `\n\nCharacters:\n${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    : '';

  const PREVIOUS_CONTEXT_CAP = 100_000;
  const previousSnippet = previousContent
    ? previousContent.length <= PREVIOUS_CONTEXT_CAP
      ? previousContent
      : previousContent.slice(-PREVIOUS_CONTEXT_CAP)
    : '';

  const prompt = `Write compelling content for a book chapter titled "${chapterTitle}".
${previousSnippet ? `\n\nPrevious context:\n${previousSnippet}` : ''}
${characterContext}
${plotContext ? `\n\nPlot context: ${plotContext}` : ''}

Write 2-3 paragraphs of engaging narrative that advances the story. Focus on vivid descriptions, character development, and compelling dialogue.`;

  const systemPrompt = 'You are a professional fiction writer with expertise in narrative construction, character development, and engaging prose.';

  if (isAnthropic()) {
    try {
      return await chatWithAnthropic(
        [{ role: 'user', content: prompt }],
        systemPrompt,
        model,
        4096
      );
    } catch (error) {
      console.error('AI Error:', error);
      throw error;
    }
  }

  try {
    const response = await openaiClient!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 4096,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('AI Error:', error);
    throw error;
  }
}

export async function improveText(text: string, instruction?: string, model: string = 'gpt-4-turbo-preview'): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI not configured. Please add your API key in settings.');
  }

  const prompt = instruction
    ? `${instruction}\n\nText to improve:\n${text}`
    : `Improve the following text by enhancing clarity, flow, and engagement while maintaining the author's voice:\n\n${text}`;

  const systemPrompt = 'You are an expert editor helping improve creative writing.';

  if (isAnthropic()) {
    try {
      const out = await chatWithAnthropic(
        [{ role: 'user', content: prompt }],
        systemPrompt,
        model,
        4096
      );
      return out || text;
    } catch (error) {
      console.error('AI Error:', error);
      throw error;
    }
  }

  try {
    const response = await openaiClient!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
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
  existingChapters: Chapter[],
  model: string = 'gpt-4-turbo-preview'
): Promise<string[]> {
  if (!isAIConfigured()) {
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

Suggest 5 compelling plot developments or story directions. Return as a JSON object with a key "suggestions" or "plots" containing an array of strings.`;

  const systemPrompt = 'You are a story consultant helping develop engaging plots. Always return valid JSON only.';

  if (isAnthropic()) {
    try {
      const text = await chatWithAnthropic(
        [{ role: 'user', content: prompt }],
        systemPrompt,
        model,
        2048
      );
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.suggestions || parsed.plots || Object.values(parsed);
    } catch (error) {
      console.error('AI Error:', error);
      throw error;
    }
  }

  try {
    const response = await openaiClient!.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
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
