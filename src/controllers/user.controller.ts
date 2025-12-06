import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const users = await this.userService.getAllUsers(page, limit);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.getUserById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.userService.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      // CORRIGIDO #18: Erro passa para middleware que retorna código apropriado
      next(error);
    }
  }

  async getUserGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const groups = await this.userService.getUserGroups(id);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }

  async addUserToGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const { groupId } = req.body;
      const result = await this.userService.addUserToGroup(userId, groupId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async removeUserFromGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.id);
      const { groupId } = req.body;
      await this.userService.removeUserFromGroup(userId, groupId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

