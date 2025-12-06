import { UserRepository } from '../repositories/user.repository';
import bcrypt from 'bcryptjs';
import { NotFoundError, ConflictError } from '../errors/custom-errors';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(page?: number, limit?: number) {
    return await this.userRepository.findAll(page, limit);
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) {
    // CORRIGIDO #4: Valida se email já existe
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });
  }

  async updateUser(id: number, data: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
    active: boolean;
  }>) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // CORRIGIDO #8: Valida se email já está em uso por outro usuário
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    // Hash de senha
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return await this.userRepository.update(id, data);
  }

  async deleteUser(id: number) {
    // CORRIGIDO #13: Verifica se usuário existe antes de deletar
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    await this.userRepository.delete(id);
  }

  async getUserGroups(userId: number) {
    return await this.userRepository.getUserGroups(userId);
  }

  async addUserToGroup(userId: number, groupId: number) {
    // CORRIGIDO #12: Valida se usuário e grupo existem
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Precisamos do GroupRepository para validar o grupo
    const { GroupRepository } = await import('../repositories/group.repository');
    const groupRepository = new GroupRepository();
    const group = await groupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    return await this.userRepository.addUserToGroup(userId, groupId);
  }

  async removeUserFromGroup(userId: number, groupId: number) {
    await this.userRepository.removeUserFromGroup(userId, groupId);
  }
}

