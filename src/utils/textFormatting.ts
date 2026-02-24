/**
 * Utility functions for formatting chapter text, especially dialogue
 */

export interface FormattedSegment {
  text: string;
  type: 'narrative' | 'dialogue' | 'dialogue-start' | 'dialogue-end';
}

/**
 * Detects and formats dialogue in text
 * Handles patterns like:
 * - "Hello," she said.
 * - "Hello," he whispered, "how are you?"
 * - "Hello." She paused. "How are you?"
 */
export function formatDialogue(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  paragraphs.forEach((para, paraIdx) => {
    if (!para.trim()) {
      if (paraIdx > 0) segments.push({ text: '\n\n', type: 'narrative' });
      return;
    }
    
    // Check if paragraph contains dialogue
    const hasDialogue = /"[^"]*"/.test(para);
    
    if (!hasDialogue) {
      // Pure narrative
      if (paraIdx > 0) segments.push({ text: '\n\n', type: 'narrative' });
      segments.push({ text: para, type: 'narrative' });
      return;
    }
    
    // Process dialogue
    if (paraIdx > 0) segments.push({ text: '\n\n', type: 'narrative' });
    
    // Split by quotes while preserving them
    const parts = para.split(/([""][^""]*[""])/);
    
    parts.forEach((part) => {
      if (!part.trim()) return;
      
      // Check if this part is quoted text
      const isQuoted = /^[""][^""]*[""]$/.test(part.trim());
      
      if (isQuoted) {
        // Remove quotes and add dialogue segments
        const dialogueText = part.replace(/^[""]|[""]$/g, '');
        if (dialogueText.trim()) {
          segments.push({ text: dialogueText, type: 'dialogue' });
        }
      } else {
        // Narrative text (dialogue tags, action, etc.)
        segments.push({ text: part, type: 'narrative' });
      }
    });
  });
  
  return segments;
}

/**
 * Formats text with dialogue styling
 * Returns JSX-ready structure
 */
export function formatTextWithDialogue(text: string): Array<{ text: string; isDialogue: boolean }> {
  const segments: Array<{ text: string; isDialogue: boolean }> = [];
  
  // Split by paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  paragraphs.forEach((para, paraIdx) => {
    if (!para.trim()) {
      if (paraIdx > 0) segments.push({ text: '\n\n', isDialogue: false });
      return;
    }
    
    // Check if paragraph contains dialogue
    const hasDialogue = /"[^"]*"/.test(para);
    
    if (!hasDialogue) {
      // Pure narrative
      if (paraIdx > 0) segments.push({ text: '\n\n', isDialogue: false });
      segments.push({ text: para, isDialogue: false });
      return;
    }
    
    // Process dialogue - split by quotes
    if (paraIdx > 0) segments.push({ text: '\n\n', isDialogue: false });
    
    // Match quoted text and surrounding narrative
    const parts = para.split(/([""][^""]*[""])/);
    
    parts.forEach((part) => {
      if (!part.trim()) return;
      
      // Check if this part is quoted text
      const isQuoted = /^[""][^""]*[""]$/.test(part.trim());
      
      if (isQuoted) {
        // Keep the quoted text but mark as dialogue (we'll style it)
        // The quotes will be styled visually, so we keep them in the text
        segments.push({ text: part, isDialogue: true });
      } else {
        // Narrative text
        segments.push({ text: part, isDialogue: false });
      }
    });
  });
  
  return segments;
}
