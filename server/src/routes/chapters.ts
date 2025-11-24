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
    const chapter = await Chapter.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Save version if content or title changed (before updating)
    const contentChanged = req.body.content !== undefined && req.body.content !== chapter.content;
    const titleChanged = req.body.title !== undefined && req.body.title !== chapter.title;
    
    if (contentChanged || titleChanged) {
      if (!chapter.versions) {
        chapter.versions = [];
      }
      
      // Add current version BEFORE updating (save the old version)
      chapter.versions.push({
        content: chapter.content || '',
        title: chapter.title || '',
        timestamp: new Date()
      });
      
      // Keep only last 50 versions
      if (chapter.versions.length > 50) {
        chapter.versions = chapter.versions.slice(-50);
      }
    }

    // Update chapter fields
    if (req.body.title !== undefined) chapter.title = req.body.title;
    if (req.body.content !== undefined) chapter.content = req.body.content;
    if (req.body.synopsis !== undefined) chapter.synopsis = req.body.synopsis;
    if (req.body.notes !== undefined) chapter.notes = req.body.notes;
    if (req.body.order !== undefined) chapter.order = req.body.order;
    if (req.body.plotPoints !== undefined) chapter.plotPoints = req.body.plotPoints;
    if (req.body.isLocked !== undefined) chapter.isLocked = req.body.isLocked;

    // Update word count using the new content value
    if (contentChanged) {
      const newContent = req.body.content || chapter.content || '';
      chapter.wordCount = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    // Mark versions as modified to ensure it's saved
    if (contentChanged || titleChanged) {
      chapter.markModified('versions');
    }
    
    await chapter.save();
    res.json(chapter);
  } catch (error: any) {
    console.error('Update chapter error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update chapter', details: error.message });
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


