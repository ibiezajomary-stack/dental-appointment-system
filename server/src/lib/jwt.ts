import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { config } from "./config.js";

export type JwtPayload = {
  sub: string;
  role: Role;
};

export function signToken(payload: JwtPayload): string {
  const opts: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.jwtSecret, opts);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
  return decoded;
}
