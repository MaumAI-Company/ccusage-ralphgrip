// Supabase adapter implementing ProfileRepository port.

import { supabase } from '@/lib/db';
import type { ProfileRepository, MemberProfileRow } from '@/lib/domain/ports';

export class SupabaseProfileRepo implements ProfileRepository {
  async getMemberByEmail(email: string): Promise<MemberProfileRow | null> {
    const { data } = await supabase
      .from('team_members')
      .select('id, name, display_name, email')
      .eq('email', email)
      .single();

    if (!data) return null;

    return {
      id: data.id as string,
      name: data.name as string,
      displayName: (data.display_name as string) ?? null,
      email: (data.email as string) ?? null,
    };
  }

  async updateDisplayName(memberId: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ display_name: displayName })
      .eq('id', memberId);

    if (error) throw error;
  }
}
