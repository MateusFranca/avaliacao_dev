import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { validate } from '../middleware/validation.middleware';
import { createGroupSchema, updateGroupSchema } from '../validators/group.validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorization.middleware';

const router = Router();
const groupController = new GroupController();

// CORRIGIDO #23: Rotas protegidas com autenticação JWT e autorização por roles
router.get('/', authenticateToken, groupController.getAllGroups.bind(groupController));
router.get('/:id', authenticateToken, groupController.getGroupById.bind(groupController));
router.post('/', authenticateToken, authorizeRoles(['admin']), validate(createGroupSchema), groupController.createGroup.bind(groupController));
router.put('/:id', authenticateToken, authorizeRoles(['admin']), validate(updateGroupSchema), groupController.updateGroup.bind(groupController));
router.delete('/:id', authenticateToken, authorizeRoles(['admin']), groupController.deleteGroup.bind(groupController));

router.get('/:id/users', authenticateToken, groupController.getGroupUsers.bind(groupController));

export default router;

