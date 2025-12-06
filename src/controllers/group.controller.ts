import { Request, Response, NextFunction } from 'express';
import { GroupService } from '../services/group.service';

export class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  async getAllGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const groups = await this.groupService.getAllGroups(page, limit);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }

  async getGroupById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const group = await this.groupService.getGroupById(id);
      res.json(group);
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const group = await this.groupService.createGroup(req.body);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const group = await this.groupService.updateGroup(id, req.body);
      res.json(group);
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.groupService.deleteGroup(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getGroupUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const users = await this.groupService.getGroupUsers(id);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }
}

