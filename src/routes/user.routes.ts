import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeRoles, authorizeOwnerOrAdmin } from '../middleware/authorization.middleware';

const router = Router();
const userController = new UserController();

// CORRIGIDO #23: Rotas protegidas com autenticação JWT e autorização por roles
router.get('/', authenticateToken, authorizeRoles(['admin', 'viewer']), userController.getAllUsers.bind(userController));
router.get('/:id', authenticateToken, authorizeOwnerOrAdmin, userController.getUserById.bind(userController));
router.post('/', validate(createUserSchema), userController.createUser.bind(userController)); // Público para cadastro
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin, validate(updateUserSchema), userController.updateUser.bind(userController));
router.delete('/:id', authenticateToken, authorizeRoles(['admin']), userController.deleteUser.bind(userController));

router.get('/:id/groups', authenticateToken, authorizeOwnerOrAdmin, userController.getUserGroups.bind(userController));
router.post('/:id/groups', authenticateToken, authorizeRoles(['admin']), userController.addUserToGroup.bind(userController));
router.delete('/:id/groups', authenticateToken, authorizeRoles(['admin']), userController.removeUserFromGroup.bind(userController));

export default router;

