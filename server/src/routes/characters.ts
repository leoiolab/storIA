import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Character from '../models/Character';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all characters for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const characters = await Character.find({ 
      projectId: req.params.projectId,
      userId: req.userId 
    }).sort({ type: 1, name: 1 });
    
    res.json(characters);
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

// Get single character
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const character = await Character.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
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
    const character = new Character({
      projectId: req.body.projectId,
      userId: req.userId,
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
  } catch (error) {
    console.error('Create character error:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// Update character
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const character = await Character.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        name: req.body.name,
        type: req.body.type,
        quickDescription: req.body.quickDescription,
        fullBio: req.body.fullBio,
        characterArc: req.body.characterArc,
        age: req.body.age,
        role: req.body.role,
        relationships: req.body.relationships || []
      },
      { new: true, runValidators: true }
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(character);
  } catch (error) {
    console.error('Update character error:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// Delete character
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const character = await Character.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

export default router;


