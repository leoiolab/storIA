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
    // Convert to strings for comparison to avoid type mismatch issues
    const currentContent = String(chapter.content || '');
    const currentTitle = String(chapter.title || '');
    const newContent = req.body.content !== undefined ? String(req.body.content || '') : currentContent;
    const newTitle = req.body.title !== undefined ? String(req.body.title || '') : currentTitle;
    
    const contentChanged = req.body.content !== undefined && newContent !== currentContent;
    const titleChanged = req.body.title !== undefined && newTitle !== currentTitle;
    
    if (contentChanged || titleChanged) {
      try {
        if (!chapter.versions) {
          chapter.versions = [];
        }
        
        // Add current version BEFORE updating (save the old version)
        // Schema requires both content and title to be strings
        chapter.versions.push({
          content: currentContent,
          title: currentTitle,
          timestamp: new Date()
        });
        
        // Keep only last 50 versions
        if (chapter.versions.length > 50) {
          chapter.versions = chapter.versions.slice(-50);
        }
        
        // Mark versions as modified to ensure it's saved
        chapter.markModified('versions');
      } catch (versionError: any) {
        console.error('Error saving version:', versionError);
        console.error('Version error details:', versionError?.message);
        // Don't fail the update if version saving fails - clear versions and continue
        chapter.versions = [];
      }
    }

    // Update chapter fields (ensure strings)
    if (req.body.title !== undefined) chapter.title = String(req.body.title || '');
    if (req.body.content !== undefined) chapter.content = String(req.body.content || '');
    if (req.body.synopsis !== undefined) chapter.synopsis = req.body.synopsis;
    if (req.body.notes !== undefined) chapter.notes = req.body.notes;
    if (req.body.order !== undefined) chapter.order = req.body.order;
    if (req.body.plotPoints !== undefined) chapter.plotPoints = req.body.plotPoints;
    if (req.body.isLocked !== undefined) chapter.isLocked = req.body.isLocked;

    // Update word count using the new content value
    if (contentChanged) {
      try {
        const newContent = req.body.content || chapter.content || '';
        chapter.wordCount = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      } catch (wordCountError: any) {
        console.error('Error calculating word count:', wordCountError);
        // Set to 0 if calculation fails
        chapter.wordCount = 0;
      }
    }
    
    await chapter.save();
    res.json(chapter);
  } catch (error: any) {
    console.error('Update chapter error:', error);
    console.error('Error details:', error?.message || String(error));
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    if (error?.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    res.status(500).json({ 
      error: 'Failed to update chapter', 
      details: error?.message || String(error),
      name: error?.name
    });
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


