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
      relationships: req.body.relationships || []
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

    const updateData: Record<string, any> = {
      name: req.body.name,
      type: req.body.type,
      quickDescription: req.body.quickDescription || '',
      fullBio: req.body.fullBio || '',
      characterArc: req.body.characterArc || '',
      age: req.body.age,
      role: req.body.role,
      relationships: req.body.relationships || [],
      userId: userObjectId // Ensure userId is set
    };

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


