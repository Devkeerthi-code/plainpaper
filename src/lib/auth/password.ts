import bcrypt from "bcryptjs";
import { z } from "zod";

const COST = 12;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email({ message: "Enter a valid email address." })),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
});

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/** Compared against when the email doesn't exist, so response time doesn't reveal which emails have accounts. */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= bcrypt.hash("not-a-real-password", COST);
  return dummyHash;
}
