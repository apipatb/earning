import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (
  userId: string,
  email: string,
  expiresIn: string = '7d'
): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';

  return jwt.sign(
    {
      userId,
      email,
    },
    secret,
    {
      expiresIn,
    }
  );
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};
