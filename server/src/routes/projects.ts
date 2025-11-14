import express, { Response } from 'express';
import { Types } from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Project from '../models/Project';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all projects for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    
    // First, try to find projects with matching userId
    let projects = await Project.find({ userId: userObjectId }).sort({ updatedAt: -1 });
    
    // If no projects found, also check for legacy projects (without userId)
    // This helps recover data that might have been lost
    if (projects.length === 0) {
      const legacyProjects = await Project.find({
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      }).sort({ updatedAt: -1 });
      
      // Migrate all legacy projects to current user
      if (legacyProjects.length > 0) {
        const legacyIds = legacyProjects.map(p => p._id);
        await Project.updateMany(
          { _id: { $in: legacyIds } },
          { $set: { userId: userObjectId } }
        );
        // Return migrated projects
        projects = await Project.find({ userId: userObjectId }).sort({ updatedAt: -1 });
      }
    } else {
      // Migrate any legacy projects that might exist alongside user's projects
      const legacyProjects = await Project.find({
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      }).sort({ updatedAt: -1 });
      
      if (legacyProjects.length > 0) {
        const legacyIds = legacyProjects.map(p => p._id);
        await Project.updateMany(
          { _id: { $in: legacyIds } },
          { $set: { userId: userObjectId } }
        );
        // Refresh to include migrated projects
        projects = await Project.find({ userId: userObjectId }).sort({ updatedAt: -1 });
      }
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
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const projectObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: projectObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    const project = await Project.findOne(legacyFilter);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.userId) {
      project.userId = userObjectId;
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
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const project = new Project({
      userId: userObjectId,
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
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const projectObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: projectObjectId,
      $or: [
        { userId: userObjectId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

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
      // Merge settings to preserve existing values
      const project = await Project.findOne(legacyFilter);
      const existingSettings = project?.settings || {};
      updateData.settings = {
        ...existingSettings,
        // Only include fields that are explicitly provided (not undefined)
        ...(req.body.settings.aiProvider !== undefined && { aiProvider: req.body.settings.aiProvider }),
        ...(req.body.settings.aiModel !== undefined && { aiModel: req.body.settings.aiModel }),
        ...(req.body.settings.aiApiKey !== undefined && { aiApiKey: req.body.settings.aiApiKey }),
      };
    }

    const project = await Project.findOneAndUpdate(
      legacyFilter,
      { $set: { ...updateData, userId: userObjectId } },
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
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new Types.ObjectId(req.userId);
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const projectObjectId = new Types.ObjectId(req.params.id);

    const legacyFilter = {
      _id: projectObjectId,
      $or: [
        { userId: userObjectId },
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


