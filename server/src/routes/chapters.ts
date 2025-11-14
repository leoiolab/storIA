import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Chapter from '../models/Chapter';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all chapters for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const chapters = await Chapter.find({ 
      projectId: req.params.projectId,
      userId: req.userId 
    }).sort({ order: 1 });
    
    res.json(chapters);
  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({ error: 'Failed to get chapters' });
  }
});

// Get single chapter
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chapter = await Chapter.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({ error: 'Failed to get chapter' });
  }
});

// Create chapter
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const chapter = new Chapter({
      projectId: req.body.projectId,
      userId: req.userId,
      title: req.body.title || 'Untitled Chapter',
      content: req.body.content || '',
      synopsis: req.body.synopsis,
      notes: req.body.notes,
      order: req.body.order || 0,
      plotPoints: req.body.plotPoints || []
    });
    
    await chapter.save();
    res.status(201).json(chapter);
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// Update chapter
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chapter = await Chapter.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        title: req.body.title,
        content: req.body.content,
        synopsis: req.body.synopsis,
        notes: req.body.notes,
        order: req.body.order,
        plotPoints: req.body.plotPoints,
        isLocked: req.body.isLocked
      },
      { new: true, runValidators: true }
    );
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// Delete chapter
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chapter = await Chapter.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// Reorder chapters
router.post('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, chapterOrders } = req.body;
    // chapterOrders should be array of { id, order }
    
    const updates = chapterOrders.map((item: { id: string, order: number }) =>
      Chapter.updateOne(
        { _id: item.id, userId: req.userId, projectId },
        { order: item.order }
      )
    );
    
    await Promise.all(updates);
    
    const chapters = await Chapter.find({ projectId, userId: req.userId }).sort({ order: 1 });
    res.json(chapters);
  } catch (error) {
    console.error('Reorder chapters error:', error);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
});

export default router;


