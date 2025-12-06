import { ProductRepository } from '../repositories/product.repository';
import { GroupRepository } from '../repositories/group.repository';
import { NotFoundError } from '../errors/custom-errors';

export class ProductService {
  private productRepository: ProductRepository;
  private groupRepository: GroupRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.groupRepository = new GroupRepository();
  }

  async getAllProducts(page?: number, limit?: number) {
    return await this.productRepository.findAll(page, limit);
  }

  async getProductById(id: number) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    groupId?: number;
  }) {
    // CORRIGIDO #11: Valida se grupo existe quando groupId é fornecido
    if (data.groupId) {
      const group = await this.groupRepository.findById(data.groupId);
      if (!group) {
        throw new NotFoundError('Group not found');
      }
    }

    return await this.productRepository.create(data);
  }

  async updateProduct(id: number, data: Partial<{
    name: string;
    description: string;
    price: number;
    stock: number;
    groupId: number;
  }>) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // CORRIGIDO #6: Validação de estoque não negativo feita no validator
    return await this.productRepository.update(id, data);
  }

  async deleteProduct(id: number) {
    await this.productRepository.delete(id);
  }

  async searchProducts(searchTerm: string) {
    // CORRIGIDO #1: SQL Injection corrigida no repository com query parametrizada
    return await this.productRepository.searchByName(searchTerm);
  }

  async getProductsByGroup(groupId: number) {
    return await this.productRepository.findByGroup(groupId);
  }
}

