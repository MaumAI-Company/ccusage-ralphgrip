import { z } from 'zod';
import { sanitizeName } from './common';

export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .transform(sanitizeName)
    .pipe(z.string().min(1, 'Display name cannot be empty').max(100)),
});

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
