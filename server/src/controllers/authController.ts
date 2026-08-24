import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword, generateJwtToken } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, role, phone } = req.body;

      if (!email || !password || !name) {
        throw new AppError('Email, password, and name are required', 400);
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      const assignedRole = ['CUSTOMER', 'ORGANISER', 'ADMIN'].includes(role) ? role : 'CUSTOMER';
      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          role: assignedRole,
          phone,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      const token = generateJwtToken(user as any);

      res.status(201).json({
        message: 'Account created successfully',
        user,
        token,
      });
    } catch (err) {
      next(err);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
      }

      const token = generateJwtToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  },

  me: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
};
