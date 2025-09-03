import express from 'express';
import workspaceController from '../Controllers/WorkspaceController.js';
import auth from '../Middleware/Auth.js';

const router = express.Router();

// Workspace CRUD
router.get('/', auth, workspaceController.getUserWorkspaces);
router.get('/:workspaceId', auth, workspaceController.getWorkspaceDetails);
router.post('/', auth, workspaceController.createWorkspace);
router.put('/:workspaceId', auth, workspaceController.updateWorkspace);
router.delete('/:workspaceId', auth, workspaceController.deleteWorkspace);

// Trash Management
router.get('/trashed/list', auth, workspaceController.getTrashedWorkspaces);
router.post('/restore/:workspaceId', auth, workspaceController.restoreWorkspace);
router.delete('/permanent/:workspaceId', auth, workspaceController.permanentDeleteWorkspace);

// Sharing
router.post('/:workspaceId/share', auth, workspaceController.shareWorkspace);

// Collaboration
router.post('/:workspaceId/collaborators', auth, workspaceController.addCollaborator);
router.delete('/:workspaceId/collaborators/:collaboratorId', auth, workspaceController.removeCollaborator);
router.put('/:workspaceId/collaborators/:collaboratorId/role', auth, workspaceController.updateCollaboratorRole);

export default router;
