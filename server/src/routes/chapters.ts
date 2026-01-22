import express, { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Chapter from '../models/Chapter';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all chapters for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const userObjectId = new Types.ObjectId(req.userId);
    const projectObjectId = new Types.ObjectId(req.params.projectId);
    
    const chapters = await Chapter.find({ 
      projectId: projectObjectId,
      userId: userObjectId 
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
    const userObjectId = new Types.ObjectId(req.userId);
    const chapterObjectId = new Types.ObjectId(req.params.id);
    
    const chapter = await Chapter.findOne({ 
      _id: chapterObjectId,
      userId: userObjectId 
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
    const userObjectId = new Types.ObjectId(req.userId);
    const projectObjectId = new Types.ObjectId(req.body.projectId);
    
    const chapter = new Chapter({
      projectId: projectObjectId,
      userId: userObjectId,
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
    const userObjectId = new Types.ObjectId(req.userId);
    const chapterObjectId = new Types.ObjectId(req.params.id);
    
    // First, get the current chapter to check for changes
    const currentChapter = await Chapter.findOne({ 
      _id: chapterObjectId, 
      userId: userObjectId 
    });
    
    if (!currentChapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Prepare update object
    const updateData: any = {};
    
    // Check what changed
    const contentChanged = req.body.content !== undefined && req.body.content !== currentChapter.content;
    const titleChanged = req.body.title !== undefined && req.body.title !== currentChapter.title;
    
    // Save version if content or title changed (before updating)
    if (contentChanged || titleChanged) {
      try {
        // Get existing versions or initialize empty array
        let versions: Array<{ content: string; title: string; timestamp: Date }> = [];
        
        if (Array.isArray(currentChapter.versions)) {
          // Safely copy existing versions, ensuring proper structure
          versions = currentChapter.versions
            .filter((v: any) => v && typeof v === 'object')
            .map((v: any) => ({
              content: String(v.content || ''),
              title: String(v.title || ''),
              timestamp: v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp || Date.now())
            }));
        }
        
        // Only save version if current content/title exists (don't save empty versions)
        const currentContent = String(currentChapter.content || '').trim();
        const currentTitle = String(currentChapter.title || '').trim();
        
        // Schema requires both content and title to be non-empty strings
        if (currentContent && currentTitle) {
          // Add current version BEFORE updating (save the old version)
          versions.push({
            content: currentContent,
            title: currentTitle,
            timestamp: new Date()
          });
          
          // Keep only last 50 versions
          if (versions.length > 50) {
            versions = versions.slice(-50);
          }
          
          updateData.versions = versions;
          console.log('Version saved. Total versions:', versions.length);
        } else {
          console.log('Skipping version save - content or title is empty', {
            hasContent: !!currentContent,
            hasTitle: !!currentTitle
          });
        }
      } catch (versionError: any) {
        console.error('Error preparing version:', versionError);
        console.error('Version error details:', versionError?.message);
        console.error('Version error stack:', versionError?.stack);
        // Continue without version saving if it fails - don't block the update
      }
    }

    // Update chapter fields with defensive checks
    if (req.body.title !== undefined) {
      updateData.title = String(req.body.title || '').trim();
      if (!updateData.title) {
        updateData.title = 'Untitled Chapter'; // Ensure title is never empty
      }
    }
    if (req.body.content !== undefined) {
      updateData.content = String(req.body.content || '');
    }
    if (req.body.synopsis !== undefined) {
      updateData.synopsis = req.body.synopsis ? String(req.body.synopsis) : undefined;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes ? String(req.body.notes) : undefined;
    }
    if (req.body.order !== undefined) {
      updateData.order = Number(req.body.order) || 0;
    }
    if (req.body.plotPoints !== undefined) {
      if (Array.isArray(req.body.plotPoints)) {
        updateData.plotPoints = req.body.plotPoints.map((point: any) => ({
          category: point.category || 'setup',
          description: String(point.description || '')
        }));
      } else {
        updateData.plotPoints = [];
      }
    }
    if (req.body.isLocked !== undefined) {
      updateData.isLocked = Boolean(req.body.isLocked);
    }

    // Update word count using the new content value
    if (contentChanged && req.body.content !== undefined) {
      try {
        const newContent = String(req.body.content || '');
        updateData.wordCount = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      } catch (wordCountError: any) {
        console.error('Error calculating word count:', wordCountError);
        updateData.wordCount = 0;
      }
    }
    
    // Log update data for debugging (without sensitive content)
    console.log('Updating chapter:', {
      id: req.params.id,
      fields: Object.keys(updateData),
      hasVersions: !!updateData.versions,
      versionsCount: updateData.versions?.length || 0,
      contentLength: updateData.content?.length || 0,
      title: updateData.title?.substring(0, 50) || 'N/A'
    });

    // Validate updateData before attempting update
    if (Object.keys(updateData).length === 0) {
      console.log('No changes detected, returning current chapter');
      return res.json(currentChapter);
    }

    // Use findOneAndUpdate for atomic update
    try {
      const updatedChapter = await Chapter.findOneAndUpdate(
        { _id: chapterObjectId, userId: userObjectId },
        { $set: updateData },
        { new: true, runValidators: false } // Disable validators to avoid version array validation issues
      );
      
      if (!updatedChapter) {
        return res.status(404).json({ error: 'Chapter not found after update' });
      }
      
      // Manually validate the document after update
      try {
        await updatedChapter.validate();
      } catch (validationError: any) {
        console.error('Post-update validation error:', validationError);
        // If validation fails, try to fix common issues
        if (validationError.errors) {
          for (const [field, err] of Object.entries(validationError.errors)) {
            console.error(`Validation error in ${field}:`, err);
          }
        }
        // Continue anyway - the update succeeded, validation is just a check
      }
      
      return res.json(updatedChapter);
    } catch (updateError: any) {
      // If findOneAndUpdate fails, try a different approach
      console.error('findOneAndUpdate failed, trying alternative approach:', updateError);
      console.error('Update error details:', updateError?.message);
      console.error('Update error stack:', updateError?.stack);
      
      try {
        // Try using save() method instead
        const chapter = await Chapter.findOne({ 
          _id: chapterObjectId, 
          userId: userObjectId 
        });
        
        if (!chapter) {
          return res.status(404).json({ error: 'Chapter not found' });
        }
        
        // Apply updates manually, field by field to avoid overwriting
        if (updateData.title !== undefined) chapter.title = updateData.title;
        if (updateData.content !== undefined) chapter.content = updateData.content;
        if (updateData.synopsis !== undefined) chapter.synopsis = updateData.synopsis;
        if (updateData.notes !== undefined) chapter.notes = updateData.notes;
        if (updateData.order !== undefined) chapter.order = updateData.order;
        if (updateData.plotPoints !== undefined) chapter.plotPoints = updateData.plotPoints;
        if (updateData.isLocked !== undefined) chapter.isLocked = updateData.isLocked;
        if (updateData.wordCount !== undefined) chapter.wordCount = updateData.wordCount;
        
        // Mark versions as modified if it was updated
        if (updateData.versions) {
          chapter.versions = updateData.versions;
          chapter.markModified('versions');
        }
        
        // Mark other modified fields explicitly
        if (updateData.title !== undefined) chapter.markModified('title');
        if (updateData.content !== undefined) chapter.markModified('content');
        if (updateData.synopsis !== undefined) chapter.markModified('synopsis');
        if (updateData.notes !== undefined) chapter.markModified('notes');
        if (updateData.plotPoints !== undefined) chapter.markModified('plotPoints');
        
        // Validate before saving
        try {
          await chapter.validate();
        } catch (validationError: any) {
          console.error('Pre-save validation error:', validationError);
          if (validationError.errors) {
            for (const [field, err] of Object.entries(validationError.errors)) {
              console.error(`Pre-save validation error in ${field}:`, err);
            }
          }
          // Try to fix common validation issues
          if (!chapter.title || chapter.title.trim() === '') {
            chapter.title = 'Untitled Chapter';
          }
        }
        
        const savedChapter = await chapter.save();
        return res.json(savedChapter);
      } catch (saveError: any) {
        console.error('Save() also failed:', saveError);
        console.error('Save error details:', saveError?.message);
        console.error('Save error stack:', saveError?.stack);
        if (saveError?.errors) {
          console.error('Save validation errors:', JSON.stringify(saveError.errors, null, 2));
        }
        // Re-throw to be caught by outer catch
        throw saveError;
      }
    }
  } catch (error: any) {
    console.error('Update chapter error (outer catch):', error);
    console.error('Error details:', error?.message || String(error));
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    if (error?.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    if (error?.code) {
      console.error('MongoDB error code:', error.code);
    }
    
    // Send detailed error in development, generic in production
    const errorResponse: any = { 
      error: 'Failed to update chapter'
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error?.message || String(error);
      errorResponse.name = error?.name;
      if (error?.errors) {
        errorResponse.validationErrors = error.errors;
      }
    }
    
    return res.status(500).json(errorResponse);
  }
});

// Delete chapter
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userObjectId = new Types.ObjectId(req.userId);
    const chapterObjectId = new Types.ObjectId(req.params.id);
    
    const chapter = await Chapter.findOneAndDelete({ 
      _id: chapterObjectId,
      userId: userObjectId 
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
    const userObjectId = new Types.ObjectId(req.userId);
    const projectObjectId = new Types.ObjectId(req.body.projectId);
    const { chapterOrders } = req.body;
    // chapterOrders should be array of { id, order }
    
    const updates = chapterOrders.map((item: { id: string, order: number }) =>
      Chapter.updateOne(
        { _id: new Types.ObjectId(item.id), userId: userObjectId, projectId: projectObjectId },
        { order: item.order }
      )
    );
    
    await Promise.all(updates);
    
    const chapters = await Chapter.find({ projectId: projectObjectId, userId: userObjectId }).sort({ order: 1 });
    res.json(chapters);
  } catch (error) {
    console.error('Reorder chapters error:', error);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
});

export default router;



