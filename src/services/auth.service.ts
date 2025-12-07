import { UserRepository } from '../repositories/user.repository';
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { BadRequestError } from '../errors/custom-errors';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(email: string, password: string) {

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new BadRequestError('Invalid email or password');
    }

    if (!user.active) {
      throw new BadRequestError('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestError('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      secret as Secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
