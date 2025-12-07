import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate } from '../middleware/validation.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorization.middleware';

const router = Router();
const productController = new ProductController();

// CORRIGIDO #23: Rotas protegidas com autenticação JWT e autorização por roles
router.get('/', authenticateToken, productController.getAllProducts.bind(productController));
router.get('/search', authenticateToken, productController.searchProducts.bind(productController));
router.get('/:id', authenticateToken, productController.getProductById.bind(productController));
router.post('/', authenticateToken, authorizeRoles(['admin', 'user']), validate(createProductSchema), productController.createProduct.bind(productController));
router.put('/:id', authenticateToken, authorizeRoles(['admin', 'user']), validate(updateProductSchema), productController.updateProduct.bind(productController));
router.delete('/:id', authenticateToken, authorizeRoles(['admin']), productController.deleteProduct.bind(productController));

router.get('/group/:groupId', authenticateToken, productController.getProductsByGroup.bind(productController));

export default router;

