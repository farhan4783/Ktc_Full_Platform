import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyEmail(req.body);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    
    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Try to get token from cookie first, then body
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
      throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    const result = await authService.refreshAccessToken(token);

    // Set updated refresh token cookie
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.forgotPassword(req.body);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Auth middleware attaches user object to req
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const result = await authService.changePassword(userId, req.body);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await authService.logout(token);
    
    // Clear cookie if present
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }
    const result = await authService.resendVerificationOtp(email);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const user = await authService.getCurrentUser(userId);
    sendSuccess(res, user, 200);
  } catch (error) {
    next(error);
  }
}
