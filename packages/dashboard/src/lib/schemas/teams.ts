import { z } from 'zod';
import { uuid } from './common';

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(80),
  displayName: z.string().max(80).optional(),
  color: z.string().max(20).optional(),
});

export type CreateTeam = z.infer<typeof CreateTeamSchema>;

export const TeamMemberSchema = z.object({
  memberId: uuid,
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;
