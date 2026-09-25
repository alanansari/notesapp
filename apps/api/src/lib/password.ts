import { hash, verify } from '@node-rs/argon2';

let dummyHash: Promise<string> | undefined;

export const hashPassword = (password: string) => hash(password);

export async function verifyPassword(passwordHash: string | undefined, password: string): Promise<boolean> {
  dummyHash ??= hash('timing-equalizer');
  try {
    return await verify(passwordHash ?? (await dummyHash), password);
  } catch {
    return false;
  }
}
