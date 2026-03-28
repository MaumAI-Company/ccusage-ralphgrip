import { createClient } from '@supabase/supabase-js';

const TEAM_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#D7BDE2',
  '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5A6BD', '#B4D7C0',
  '#E8DAEF', '#FCF3CF', '#D6EAF8', '#FADBD8', '#D5F5E3',
  '#FDEBD0', '#D4E6F1', '#EBDEF0', '#FEF9E7', '#EAF2F8',
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const teamCountIdx = args.indexOf('--teams');
  const teamCount = teamCountIdx >= 0 ? parseInt(args[teamCountIdx + 1]) : 10;
  const withTestMembers = args.includes('--test-members');
  const fileIdx = args.indexOf('--file');

  const supabase = createClient(url, key);

  if (fileIdx >= 0) {
    // Load teams from JSON file
    const fs = await import('fs');
    const teams = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf-8'));
    for (const team of teams) {
      const { data, error } = await supabase
        .from('hackathon_teams')
        .upsert({ name: team.name, display_name: team.displayName, color: team.color })
        .select('id')
        .single();
      if (error) console.error(`Team ${team.name}:`, error.message);
      else console.log(`✓ Team: ${team.name} (${data.id})`);
    }
  } else {
    // Generate N teams
    for (let i = 1; i <= teamCount; i++) {
      const name = `team-${String(i).padStart(3, '0')}`;
      const displayName = `Team ${i}`;
      const color = TEAM_COLORS[(i - 1) % TEAM_COLORS.length];
      const { data, error } = await supabase
        .from('hackathon_teams')
        .upsert({ name, display_name: displayName, color })
        .select('id')
        .single();
      if (error) console.error(`Team ${name}:`, error.message);
      else console.log(`✓ Team: ${displayName} (${data.id})`);
    }
  }

  if (withTestMembers) {
    const testMembers = [
      'Alice Test', 'Bob Test', 'Carol Test',
      'Dave Test', 'Eve Test', 'Frank Test',
    ];
    const { data: teams } = await supabase
      .from('hackathon_teams')
      .select('id')
      .order('created_at')
      .limit(3);

    for (let i = 0; i < testMembers.length; i++) {
      const name = testMembers[i];
      const email = `${name.toLowerCase().replace(' ', '.')}@ralphgrip.com`;
      const { data: member, error } = await supabase
        .from('team_members')
        .upsert({ name, email }, { onConflict: 'name' })
        .select('id')
        .single();
      if (error) { console.error(`Member ${name}:`, error.message); continue; }
      console.log(`✓ Member: ${name} (${member.id})`);

      if (teams && teams[Math.floor(i / 2)]) {
        const teamId = teams[Math.floor(i / 2)].id;
        await supabase
          .from('team_memberships')
          .upsert({ team_id: teamId, member_id: member.id }, { onConflict: 'team_id,member_id' });
        console.log(`  → Assigned to team ${Math.floor(i / 2) + 1}`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
