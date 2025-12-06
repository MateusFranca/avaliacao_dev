import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const products = await this.productService.getAllProducts(page, limit);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productService.getProductById(id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await this.productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productService.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.productService.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      // CORRIGIDO #9: Valida se searchTerm foi fornecido
      const { searchTerm } = req.query;
      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ error: 'searchTerm query parameter is required' });
      }
      const products = await this.productService.searchProducts(searchTerm);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async getProductsByGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = parseInt(req.params.groupId);
      const products = await this.productService.getProductsByGroup(groupId);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
}

