import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { ENV } from '../config/env';
import { AuthUser } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJwtToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateBookingReference = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'TB-';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  ref += '-';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

export const generateSecureToken = (bytes: number = 32): string => {
  return randomBytes(bytes).toString('hex');
};
