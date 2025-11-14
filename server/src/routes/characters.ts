import express, { Response } from 'express';
import { Types } from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Character from '../models/Character';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all characters for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const projectObjectId = new Types.ObjectId(req.params.projectId);

    const legacyFilter = {
      projectId: projectObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const characters = await Character.find(legacyFilter).sort({ type: 1, name: 1 });
    
    // Migrate legacy characters
    const legacyIds = characters.filter(char => !char.userId).map(char => char._id);
    if (legacyIds.length > 0) {
      await Character.updateMany({ _id: { $in: legacyIds } }, { $set: { userId: userObjectId } });
      const refreshed = await Character.find({ projectId: projectObjectId, userId: userObjectId }).sort({ type: 1, name: 1 });
      return res.json(refreshed);
    }
    
    res.json(characters);
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

// Get single character
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid character id' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const characterObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: characterObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const character = await Character.findOne(legacyFilter);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Migrate legacy character
    if (!character.userId) {
      character.userId = userObjectId;
      await character.save();
    }
    
    res.json(character);
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({ error: 'Failed to get character' });
  }
});

// Create character
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const projectObjectId = new Types.ObjectId(req.body.projectId);

    // Parse relationships if it's a string (legacy data or serialization issue)
    let relationships = req.body.relationships || [];
    if (typeof relationships === 'string') {
      try {
        relationships = JSON.parse(relationships);
      } catch (e) {
        console.error('Failed to parse relationships string:', e);
        relationships = [];
      }
    }
    // Ensure relationships is an array
    if (!Array.isArray(relationships)) {
      relationships = [];
    }

    const character = new Character({
      projectId: projectObjectId,
      userId: userObjectId,
      name: req.body.name,
      type: req.body.type,
      quickDescription: req.body.quickDescription || '',
      fullBio: req.body.fullBio || '',
      characterArc: req.body.characterArc || '',
      age: req.body.age,
      role: req.body.role,
      relationships: relationships
    });
    
    await character.save();
    res.status(201).json(character);
  } catch (error: any) {
    console.error('Create character error:', error);
    res.status(500).json({ error: error.message || 'Failed to create character' });
  }
});

// Update character
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid character id' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const characterObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: characterObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    // Log the raw request body to see what Express received
    console.log('=== RAW REQUEST BODY ===');
    console.log('req.body type:', typeof req.body);
    console.log('req.body.relationships type:', typeof req.body.relationships);
    console.log('req.body.relationships value:', req.body.relationships);
    console.log('req.body.relationships constructor:', req.body.relationships?.constructor?.name);
    if (typeof req.body.relationships === 'string') {
      console.log('req.body.relationships string length:', req.body.relationships.length);
      console.log('req.body.relationships first 100 chars:', req.body.relationships.substring(0, 100));
    }

    // Parse relationships if it's a string (legacy data or serialization issue)
    let relationships = req.body.relationships;
    
    // Debug logging
    console.log('Update character - relationships type:', typeof relationships);
    console.log('Update character - relationships value:', relationships);
    console.log('Update character - relationships constructor:', relationships?.constructor?.name);
    
    // Handle different input types
    if (relationships === undefined || relationships === null) {
      relationships = [];
    } else if (typeof relationships === 'string') {
      try {
        let cleaned = relationships.trim();
        
        // First, try direct JSON parse (most common case - valid JSON string)
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
              relationships = parsed;
              console.log('Successfully parsed relationships as JSON array:', relationships.length, 'items');
            } else {
              console.error('Parsed JSON is not an array:', typeof parsed, parsed);
              relationships = [];
            }
            // Successfully parsed, continue
          } catch (parseError) {
            // If direct parse fails, it might be malformed JSON (e.g., single quotes instead of double)
            console.log('Direct JSON parse failed, trying to clean string:', parseError);
            console.log('String to parse:', cleaned.substring(0, 200));
            
            // Check if it has single quotes (invalid JSON but valid JavaScript)
            // Even if it has double quotes (outer quotes), inner single quotes need to be converted
            if (cleaned.includes("'")) {
              console.log('Detected single quotes, converting to double quotes for JSON...');
              console.log('Original string:', cleaned.substring(0, 150));
              // Replace single quotes with double quotes
              // But be careful - we need to handle the outer quotes too
              let quoteFixed = cleaned.replace(/'/g, '"');
              console.log('After quote conversion:', quoteFixed.substring(0, 150));
              try {
                const parsed = JSON.parse(quoteFixed);
                if (Array.isArray(parsed)) {
                  relationships = parsed;
                  console.log('Successfully parsed after converting single to double quotes, got', parsed.length, 'items');
                  // Skip the rest of the error handling - we have a valid array
                } else {
                  console.error('Parsed result is not an array:', typeof parsed, parsed);
                  throw new Error('Parsed result is not an array');
                }
              } catch (e: any) {
                console.log('Failed to parse after quote conversion:', e?.message || e);
                console.log('Quote-fixed string that failed:', quoteFixed.substring(0, 200));
                // Continue to other cleaning methods
              }
            }
            
            // If we still don't have an array, continue with other cleaning methods
            if (typeof relationships === 'string') {
              // Handle JavaScript code-like string format (e.g., "[\n' +\n  '  {\n' +...")
              // This happens when an array is converted to string using toString() or similar
              if (cleaned.includes("' +") || cleaned.includes('" +') || cleaned.includes("' +'") || cleaned.includes("\\n")) {
                console.log('Detected JavaScript code-like format, attempting to reconstruct...');
              
              // Step 1: Remove all string concatenation operators
              cleaned = cleaned
                .replace(/' \+/g, '')
                .replace(/" \+/g, '')
                .replace(/\s*\+\s*/g, '') // Remove any remaining + operators
                .trim();
              
              // Step 2: Replace escaped newlines and actual newlines
              cleaned = cleaned
                .replace(/\\n/g, '') // Remove escaped newlines
                .replace(/\n/g, '') // Remove actual newlines
                .replace(/\r/g, '') // Remove carriage returns
                .trim();
              
              // Step 3: Replace single quotes with double quotes for JSON
              // But be careful - we need to preserve quotes inside strings
              // First, let's try to find the array structure
              const arrayStart = cleaned.indexOf('[');
              const arrayEnd = cleaned.lastIndexOf(']');
              
              if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                // Extract just the array part
                let arrayPart = cleaned.substring(arrayStart, arrayEnd + 1);
                
                // Replace single quotes with double quotes (simple approach)
                // This works because we know the structure: { key: 'value' }
                arrayPart = arrayPart.replace(/'/g, '"');
                
                // Try to parse it
                try {
                  relationships = JSON.parse(arrayPart);
                  console.log('Successfully parsed after cleaning JavaScript code format');
                } catch (e2) {
                  console.error('Failed to parse after cleaning:', e2);
                  console.error('Cleaned array part:', arrayPart);
                  relationships = [];
                }
              } else {
                console.error('Could not find array boundaries in cleaned string');
                relationships = [];
              }
            } else {
              // Doesn't look like JavaScript code, try other cleaning
              cleaned = cleaned
                .replace(/\n/g, '')
                .replace(/\r/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                try {
                  relationships = JSON.parse(cleaned);
                } catch (e3) {
                  console.error('Failed to parse after basic cleaning:', e3);
                  relationships = [];
                }
              } else {
                console.error('Cleaned string does not look like JSON array:', cleaned);
                relationships = [];
              }
            }
            }
          }
        } else {
          // Doesn't look like an array string, set to empty
          console.error('Relationships string does not start with [ and end with ]:', cleaned);
          relationships = [];
        }
      } catch (e) {
        console.error('Failed to parse relationships string:', e);
        console.error('Original string value was:', relationships);
        relationships = [];
      }
    }
    
    // Ensure relationships is an array
    if (!Array.isArray(relationships)) {
      console.error('Relationships is not an array after parsing:', typeof relationships, relationships);
      relationships = [];
    }
    
    // Validate and clean relationships array - ensure all fields are strings
    relationships = relationships
      .filter((rel: any) => rel && typeof rel === 'object')
      .map((rel: any) => ({
        characterId: String(rel.characterId || ''),
        type: String(rel.type || ''),
        description: String(rel.description || '')
      }));

    // Final validation - ensure it's definitely an array
    if (!Array.isArray(relationships)) {
      console.error('CRITICAL: Relationships is still not an array after all parsing!', typeof relationships, relationships);
      relationships = [];
    }

    console.log('Final relationships before save:', {
      type: typeof relationships,
      isArray: Array.isArray(relationships),
      length: relationships.length,
      sample: relationships[0]
    });

    const updateData: Record<string, any> = {
        name: req.body.name,
        type: req.body.type,
      quickDescription: req.body.quickDescription || '',
      fullBio: req.body.fullBio || '',
      characterArc: req.body.characterArc || '',
        age: req.body.age,
        role: req.body.role,
      relationships: relationships, // This MUST be an array, not a string
      userId: userObjectId // Ensure userId is set
    };

    // Double-check updateData.relationships is an array
    if (typeof updateData.relationships === 'string') {
      console.error('CRITICAL: updateData.relationships is a string! Attempting to parse again...');
      console.error('String value:', updateData.relationships.substring(0, 200));
      try {
        // Try to parse with single quote conversion
        let toParse = updateData.relationships.trim();
        if (toParse.includes("'")) {
          toParse = toParse.replace(/'/g, '"');
        }
        updateData.relationships = JSON.parse(toParse);
        console.log('Successfully parsed updateData.relationships after second attempt');
      } catch (e: any) {
        console.error('Failed to parse updateData.relationships:', e?.message || e);
        updateData.relationships = [];
      }
    }
    
    // Final check before saving
    if (!Array.isArray(updateData.relationships)) {
      console.error('CRITICAL: updateData.relationships is STILL not an array after all attempts!', typeof updateData.relationships);
      updateData.relationships = [];
    }

    // CRITICAL: One final check - ensure relationships is definitely an array
    // This is the last chance before Mongoose tries to save it
    if (typeof updateData.relationships === 'string') {
      console.error('FATAL: relationships is STILL a string right before Mongoose save!');
      console.error('String value:', updateData.relationships);
      // Force parse it one more time
      try {
        let toParse = updateData.relationships.trim();
        // Handle both formats
        if (toParse.includes("' +") || toParse.includes("\\n")) {
          // JavaScript code format - clean it
          toParse = toParse
            .replace(/' \+/g, '')
            .replace(/" \+/g, '')
            .replace(/\\n/g, '')
            .replace(/\n/g, '')
            .replace(/'/g, '"');
          const arrayStart = toParse.indexOf('[');
          const arrayEnd = toParse.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd !== -1) {
            toParse = toParse.substring(arrayStart, arrayEnd + 1);
          }
        } else if (toParse.includes("'")) {
          // Single quotes - convert to double
          toParse = toParse.replace(/'/g, '"');
        }
        updateData.relationships = JSON.parse(toParse);
        console.log('FATAL recovery: Successfully parsed relationships at the last moment');
      } catch (e: any) {
        console.error('FATAL: Could not parse relationships even at the last moment:', e?.message);
        updateData.relationships = [];
      }
    }
    
    // Final type check
    if (!Array.isArray(updateData.relationships)) {
      console.error('FATAL: relationships is not an array, setting to empty array');
      updateData.relationships = [];
    }
    
    console.log('About to save to Mongoose - relationships type:', typeof updateData.relationships, 'isArray:', Array.isArray(updateData.relationships));

    const character = await Character.findOneAndUpdate(
      legacyFilter,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(character);
  } catch (error: any) {
    console.error('Update character error:', error);
    res.status(500).json({ error: error.message || 'Failed to update character' });
  }
});

// Delete character
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid character id' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const characterObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: characterObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const character = await Character.findOneAndDelete(legacyFilter);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json({ message: 'Character deleted successfully' });
  } catch (error: any) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete character' });
  }
});

export default router;


