import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await this.authService.login(email, password);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({
        error: error.message || 'Authentication failed'
      });
    }
  }
}
