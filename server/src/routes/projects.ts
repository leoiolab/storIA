import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Project from '../models/Project';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all projects for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const legacyFilter = {
      $or: [
        { userId: req.userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const projects = await Project.find(legacyFilter).sort({ updatedAt: -1 });
    const legacyIds = projects.filter(project => !project.userId).map(project => project._id);

    if (legacyIds.length > 0) {
      await Project.updateMany(
        { _id: { $in: legacyIds } },
        { $set: { userId: req.userId } }
      );

      const refreshed = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 });
      return res.json(refreshed);
    }

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const legacyFilter = {
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const project = await Project.findOne(legacyFilter);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.userId) {
      project.userId = req.userId!;
      await project.save();
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

    const legacyFilter = {
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const project = await Project.findOneAndUpdate(
      legacyFilter,
      { $set: { ...updateData, userId: req.userId } },
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
    const legacyFilter = {
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const project = await Project.findOneAndDelete(legacyFilter);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;


