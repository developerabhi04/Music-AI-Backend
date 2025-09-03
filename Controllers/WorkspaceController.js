import Workspace from '../Models/Workspace.js';
import Song from '../Models/Song.js';
import User from '../Models/User.js';
import crypto from 'crypto';

class WorkspaceController {
  // Get User's Workspaces
  async getUserWorkspaces(req, res) {
    try {
      const userId = req.user.id;
      const { includeShared = true, includeTrashed = false } = req.query;

      const workspaces = await Workspace.findByUser(
        userId, 
        includeShared === 'true'
      );

      // Filter out trashed workspaces unless specifically requested
      const filteredWorkspaces = includeTrashed === 'true' 
        ? workspaces 
        : workspaces.filter(w => !w.isTrashed);

      res.json({
        success: true,
        data: {
          workspaces: filteredWorkspaces,
          total: filteredWorkspaces.length
        }
      });

    } catch (error) {
      console.error('Get user workspaces error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workspaces',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Workspace Details
  async getWorkspaceDetails(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId)
        .populate('user', 'username email avatar')
        .populate('collaborators.user', 'username email avatar')
        .populate({
          path: 'songs',
          select: 'title status duration createdAt audioUrl thumbnailUrl isFavorite',
          options: { sort: { createdAt: -1 } }
        });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user has access to this workspace
      const hasAccess = workspace.user._id.toString() === userId ||
                       workspace.collaborators.some(c => c.user._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this workspace'
        });
      }

      // Update stats
      await workspace.updateStats();

      res.json({
        success: true,
        data: workspace
      });

    } catch (error) {
      console.error('Get workspace details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workspace details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create Workspace
  async createWorkspace(req, res) {
    try {
      const { name, description, color, icon, tags } = req.body;
      const userId = req.user.id;

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Workspace name is required'
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Workspace name cannot exceed 100 characters'
        });
      }

      // Check if user already has a workspace with this name
      const existingWorkspace = await Workspace.findOne({
        user: userId,
        name: name.trim(),
        isTrashed: false
      });

      if (existingWorkspace) {
        return res.status(400).json({
          success: false,
          message: 'You already have a workspace with this name'
        });
      }

      const workspace = new Workspace({
        name: name.trim(),
        description: description?.trim(),
        color: color || '#ff6b35',
        icon: icon || 'music',
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        user: userId
      });

      await workspace.save();

      // Add to user's workspaces
      await User.findByIdAndUpdate(userId, {
        $push: { workspaces: workspace._id }
      });

      const populatedWorkspace = await Workspace.findById(workspace._id)
        .populate('user', 'username email avatar');

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: populatedWorkspace
      });

    } catch (error) {
      console.error('Create workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update Workspace
  async updateWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const { name, description, color, icon, tags, settings } = req.body;
      const userId = req.user.id;

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId,
        isTrashed: false
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Check if user has permission to edit
      if (!workspace.hasPermission(userId, 'canManageWorkspace')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this workspace'
        });
      }

      // Update fields
      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Workspace name cannot be empty'
          });
        }
        workspace.name = name.trim();
      }

      if (description !== undefined) workspace.description = description?.trim();
      if (color !== undefined) workspace.color = color;
      if (icon !== undefined) workspace.icon = icon;
      
      if (tags !== undefined) {
        workspace.tags = Array.isArray(tags) 
          ? tags.map(tag => tag.trim()).filter(Boolean)
          : tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      if (settings !== undefined) {
        workspace.settings = { ...workspace.settings, ...settings };
      }

      await workspace.save();

      const updatedWorkspace = await Workspace.findById(workspaceId)
        .populate('user', 'username email avatar')
        .populate('collaborators.user', 'username email avatar');

      res.json({
        success: true,
        message: 'Workspace updated successfully',
        data: updatedWorkspace
      });

    } catch (error) {
      console.error('Update workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete Workspace (Move to Trash)
  async deleteWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      if (workspace.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default workspace'
        });
      }

      workspace.isTrashed = true;
      workspace.trashedAt = new Date();
      await workspace.save();

      res.json({
        success: true,
        message: 'Workspace moved to trash successfully'
      });

    } catch (error) {
      console.error('Delete workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Trashed Workspaces
  async getTrashedWorkspaces(req, res) {
    try {
      const userId = req.user.id;

      const workspaces = await Workspace.find({ 
        user: userId, 
        isTrashed: true 
      })
      .populate('user', 'username email avatar')
      .select('name description trashedAt stats')
      .sort({ trashedAt: -1 });

      res.json({
        success: true,
        data: {
          workspaces,
          total: workspaces.length
        }
      });

    } catch (error) {
      console.error('Get trashed workspaces error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trashed workspaces',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Restore Workspace
  async restoreWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findOneAndUpdate(
        { _id: workspaceId, user: userId, isTrashed: true },
        { 
          isTrashed: false,
          $unset: { trashedAt: 1 }
        },
        { new: true }
      ).populate('user', 'username email avatar');

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Trashed workspace not found'
        });
      }

      res.json({
        success: true,
        message: 'Workspace restored successfully',
        data: workspace
      });

    } catch (error) {
      console.error('Restore workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Permanently Delete Workspace
  async permanentDeleteWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      if (workspace.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot permanently delete default workspace'
        });
      }

      // Delete all songs in this workspace
      const deletedSongs = await Song.deleteMany({ workspace: workspaceId });

      // Remove from user's workspaces
      await User.findByIdAndUpdate(userId, {
        $pull: { workspaces: workspaceId }
      });

      // Delete the workspace
      await Workspace.findByIdAndDelete(workspaceId);

      res.json({
        success: true,
        message: 'Workspace permanently deleted successfully',
        data: {
          songsDeleted: deletedSongs.deletedCount
        }
      });

    } catch (error) {
      console.error('Permanent delete workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to permanently delete workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Share Workspace
  async shareWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const { 
        isPublic = false, 
        allowComments = false, 
        allowDownloads = false,
        expiresAt 
      } = req.body;
      const userId = req.user.id;

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Generate share token if not exists
      if (!workspace.shareToken) {
        workspace.shareToken = crypto.randomBytes(32).toString('hex');
      }

      workspace.isShared = true;
      workspace.shareSettings = {
        isPublic,
        allowComments,
        allowDownloads,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      };

      await workspace.save();

      const shareUrl = `${process.env.FRONTEND_URL}/shared/workspace/${workspace.shareToken}`;

      res.json({
        success: true,
        message: 'Workspace shared successfully',
        data: {
          shareToken: workspace.shareToken,
          shareUrl,
          shareSettings: workspace.shareSettings
        }
      });

    } catch (error) {
      console.error('Share workspace error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to share workspace',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add Collaborator
  async addCollaborator(req, res) {
    try {
      const { workspaceId } = req.params;
      const { email, role = 'viewer' } = req.body;
      const userId = req.user.id;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      // Find user to invite
      const inviteUser = await User.findOne({ email: email.toLowerCase() });
      if (!inviteUser) {
        return res.status(404).json({
          success: false,
          message: 'User with this email not found'
        });
      }

      if (inviteUser._id.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot invite yourself'
        });
      }

      try {
        await workspace.addCollaborator(inviteUser._id, role, userId);

        const updatedWorkspace = await Workspace.findById(workspaceId)
          .populate('collaborators.user', 'username email avatar');

        res.json({
          success: true,
          message: `Successfully invited ${inviteUser.username} as ${role}`,
          data: {
            collaborators: updatedWorkspace.collaborators
          }
        });

      } catch (addError) {
        if (addError.message.includes('already a collaborator')) {
          return res.status(400).json({
            success: false,
            message: 'User is already a collaborator on this workspace'
          });
        }
        throw addError;
      }

    } catch (error) {
      console.error('Add collaborator error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add collaborator',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove Collaborator
  async removeCollaborator(req, res) {
    try {
      const { workspaceId, collaboratorId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      await workspace.removeCollaborator(collaboratorId);

      res.json({
        success: true,
        message: 'Collaborator removed successfully'
      });

    } catch (error) {
      console.error('Remove collaborator error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove collaborator',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update Collaborator Role
  async updateCollaboratorRole(req, res) {
    try {
      const { workspaceId, collaboratorId } = req.params;
      const { role } = req.body;
      const userId = req.user.id;

      if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Valid role is required (viewer, editor, admin)'
        });
      }

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        user: userId
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }

      try {
        await workspace.updateCollaboratorRole(collaboratorId, role);

        const updatedWorkspace = await Workspace.findById(workspaceId)
          .populate('collaborators.user', 'username email avatar');

        res.json({
          success: true,
          message: 'Collaborator role updated successfully',
          data: {
            collaborators: updatedWorkspace.collaborators
          }
        });

      } catch (updateError) {
        if (updateError.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: 'Collaborator not found'
          });
        }
        throw updateError;
      }

    } catch (error) {
      console.error('Update collaborator role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update collaborator role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new WorkspaceController();
