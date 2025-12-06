import { GroupRepository } from '../repositories/group.repository';
import { ProductRepository } from '../repositories/product.repository';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/custom-errors';

export class GroupService {
  private groupRepository: GroupRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.groupRepository = new GroupRepository();
    this.productRepository = new ProductRepository();
  }

  async getAllGroups(page?: number, limit?: number) {
    return await this.groupRepository.findAll(page, limit);
  }

  async getGroupById(id: number) {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new NotFoundError('Group not found');
    }
    return group;
  }

  async createGroup(data: { name: string; description?: string }) {
    // CORRIGIDO #14: Valida se grupo com mesmo nome já existe
    const existing = await this.groupRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Group name already exists');
    }
    return await this.groupRepository.create(data);
  }

  async updateGroup(id: number, data: Partial<{ name: string; description: string }>) {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    return await this.groupRepository.update(id, data);
  }

  async deleteGroup(id: number) {
    // CORRIGIDO #15: Verifica se há produtos associados antes de deletar
    const products = await this.productRepository.findByGroup(id);
    if (products.length > 0) {
      throw new BadRequestError('Cannot delete group with associated products');
    }
    await this.groupRepository.delete(id);
  }

  async getGroupUsers(groupId: number) {
    return await this.groupRepository.getGroupUsers(groupId);
  }
}

