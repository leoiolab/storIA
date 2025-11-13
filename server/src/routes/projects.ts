import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Project from '../models/Project';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all projects for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Create project
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const project = new Project({
      userId: req.userId,
      name: req.body.name || 'Untitled Project',
      metadata: req.body.metadata || {},
      settings: req.body.settings || {}
    });
    
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updateData: Record<string, any> = {};

    if (typeof req.body.name === 'string' && req.body.name.trim().length > 0) {
      updateData.name = req.body.name.trim();
    } else if (req.body.metadata?.title) {
      updateData.name = req.body.metadata.title;
    }

    if (req.body.metadata) {
      const metadataUpdate = { ...req.body.metadata };

      if (Array.isArray(metadataUpdate.themes)) {
        metadataUpdate.themes = metadataUpdate.themes.join(', ');
      }

      updateData.metadata = metadataUpdate;
    }

    if (req.body.settings) {
      updateData.settings = req.body.settings;
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // TODO: Also delete related characters and chapters
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;


