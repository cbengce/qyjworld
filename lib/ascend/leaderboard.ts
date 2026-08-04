export const ASCEND_LEADERBOARD_LIMIT = 10;

export type AscendLevel = {
  level: number;
  name: "Dreamer" | "Explorer" | "Ascender" | "Pathfinder" | "Cloud Rider";
  minimum: number;
  nextMinimum?: number;
};

export type AscendLeaderboardEntry = {
  rank: number;
  displayIdentity: string;
  successfulReferrals: number;
  totalProfileCompletions: number;
  totalShares: number;
  level: AscendLevel;
  updatedAt: string;
};

export type AscendPersonalRank = Omit<AscendLeaderboardEntry, "displayIdentity">;

const levels: AscendLevel[] = [
  { level: 5, name: "Cloud Rider", minimum: 20 },
  { level: 4, name: "Pathfinder", minimum: 10, nextMinimum: 20 },
  { level: 3, name: "Ascender", minimum: 5, nextMinimum: 10 },
  { level: 2, name: "Explorer", minimum: 3, nextMinimum: 5 },
  { level: 1, name: "Dreamer", minimum: 0, nextMinimum: 3 }
];

export function ascendLevelFor(completedReferrals: number): AscendLevel {
  const safeCount = Math.max(0, Math.floor(completedReferrals));
  return levels.find((level) => safeCount >= level.minimum) ?? levels[levels.length - 1];
}

export function progressToNextAscendLevel(completedReferrals: number) {
  const level = ascendLevelFor(completedReferrals);
  if (!level.nextMinimum) return { current: completedReferrals, target: completedReferrals, remaining: 0, percent: 100 };
  const earnedWithinLevel = Math.max(0, completedReferrals - level.minimum);
  const levelRange = level.nextMinimum - level.minimum;
  return {
    current: completedReferrals,
    target: level.nextMinimum,
    remaining: Math.max(0, level.nextMinimum - completedReferrals),
    percent: Math.min(100, Math.round((earnedWithinLevel / levelRange) * 100))
  };
}

type LeaderboardRpcRow = {
  rank_position: number | string;
  display_identity?: string;
  successful_referrals: number | string;
  total_profile_completions: number | string;
  total_shares: number | string;
  updated_at: string;
};

export function mapAscendLeaderboardRow(row: LeaderboardRpcRow): AscendLeaderboardEntry {
  const successfulReferrals = Number(row.successful_referrals);
  return {
    rank: Number(row.rank_position),
    displayIdentity: row.display_identity ?? "ASCENDER",
    successfulReferrals,
    totalProfileCompletions: Number(row.total_profile_completions),
    totalShares: Number(row.total_shares),
    level: ascendLevelFor(successfulReferrals),
    updatedAt: row.updated_at
  };
}

export function mapAscendPersonalRank(row: LeaderboardRpcRow): AscendPersonalRank {
  const { displayIdentity: _displayIdentity, ...rank } = mapAscendLeaderboardRow(row);
  return rank;
}
