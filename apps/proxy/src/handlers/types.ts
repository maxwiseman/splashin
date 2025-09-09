export type GetLocationByIdResponse = LocationById[];
export interface LocationById {
  u: string;
  l: number;
  lo: number;
  a: string;
  ac: number;
  up: Date;
  av: string;
  i: string;
  bl: number;
  ic: boolean;
  s: number;
  h: number;
  c: string;
  r: string;
  isz: boolean;
}

export interface GameDashboardResponse {
  game: Game;
  round: Round;
  purge: null;
  isPurge: boolean;
  totalPlayers: number;
  isCurrentUserOwner: boolean;
  isCurrentUserAdmin: boolean;
  nextRoundStartIfInBuffer: null;
  latestAnnouncement: null;
  adminPendingEliminationCount: null;
  adminPendingSafeZoneCount: null;
  adminPendingPlayerCount: null;
  myEliminationsWaitingForApprovalCount: number;
  currentPlayer: CurrentPlayer;
  winner: Winner;
  targets: Target[];
  bounties: any[];
  myTeam: MyTeam[];
  latestActivity: LatestActivity;
  isLocationApprovalsPending: boolean;
  trialAvailable: boolean;
  trialExpiresAt: null;
  promptConversion: boolean;
  premiumCount: number;
}

export interface CurrentPlayer {
  id: string;
  subscription_level: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
  avatar_path_medium: null;
  avatar_path_small: string;
  location_enabled: boolean;
  eliminated: boolean;
  eliminated_at: null;
  eliminated_by: null;
  marked_safe: boolean;
  active_in_round: boolean;
  safe_from_purge: boolean;
  team_name: string;
  team_id: string;
  team_color: string;
  team_created_by: string;
  location_updated_at: Date;
  elimination_count: number;
  is_safe: boolean;
  is_safe_expires_at: null;
  is_vanished: boolean;
  is_vanished_expires_at: null;
  is_trace: boolean;
  is_trace_expires_at: null;
  is_bounty: boolean;
  is_bounty_expires_at: null;
  points: number;
  last_location_access_approval_at: Date;
  trial_available: boolean;
  prompt_conversion: boolean;
  trial_expires_at: null;
  safe_zone_cache: null;
}

export interface Game {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  enable_purge: boolean;
  purge_length_hours: number;
  round_length_hours: number;
  custom_rules: string;
  status: string;
  join_code: string;
  registration_open: boolean;
  start_at: Date;
  end_at: null;
  time_zone: string;
  location_required: boolean;
  max_players_per_team: number;
  max_teams: number;
  type: string;
  fifteen_minute_reminder_sent: Date;
  max_players: number;
  other_player_location_accuracy: number;
  other_player_location_enabled: boolean;
  full_team_elimination_required: boolean;
  deleted_at: null;
  inherit_targets: boolean;
  elimination_required: boolean;
  basic_update_interval: number;
  hide_admins: boolean;
  elimination_approval_required: boolean;
  round_buffer_length_hours: number;
  purge_safety: boolean;
  standard_rules: string;
  purge_all_locations: boolean;
  can_submit_eliminations_for_anyone: boolean;
  disable_chats: boolean;
  auto_revive: boolean;
  item_purchases_enabled: boolean;
  mode: string;
  item_usage_enabled: boolean;
  ss: boolean;
  ssn: boolean;
  safe_zone_cache: null;
  personal_safe_zone_enabled: boolean;
  personal_safe_zone_approval_required: boolean;
  personal_safe_zone_hide_all_players: boolean;
}

export interface LatestActivity {
  pending: Pending;
  approved: null;
}

export interface Pending {
  count: number;
  thumbnail: null;
}

export interface MyTeam {
  id: string;
  team_leaderboard_position: null;
  team_points: number;
  subscription_level: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
  avatar_path_medium: null;
  avatar_path_small: string;
  location_enabled: boolean;
  eliminated: boolean;
  eliminated_at: null;
  eliminated_by: null;
  marked_safe: boolean;
  is_safe: boolean;
  is_vanished: boolean;
  is_trace: boolean;
  is_bounty: boolean;
  active_in_round: boolean;
  safe_from_purge: boolean;
  team_name: string;
  team_id: string;
  team_color: string;
  team_created_by: string;
  location_updated_at: Date;
  elimination_count: number;
  player_points: number;
}

export interface Round {
  id: string;
  idx: number;
  name: string;
  start_at: Date;
  end_at: Date;
  time_zone: string;
}

export interface Target {
  id: string;
  target_id: string;
  user_id: string;
  avatar_path: string;
  avatar_path_medium: null;
  avatar_path_small: string;
  subscription_level: number;
  first_name: string;
  last_name: string;
  city: string;
  region: string;
  user_location_updated_at: Date;
  battery_level: number;
  battery_is_charging: boolean;
  location_enabled: boolean;
  team_id: string;
  team_name: string;
  team_color: string;
  eliminated: boolean;
  marked_safe: boolean;
  is_safe: boolean;
  is_vanished: boolean;
  is_trace: boolean;
  is_bounty: boolean;
  safe_from_purge: boolean;
}

export interface Winner {
  type: string;
  id: null;
  name: null;
  initials: string;
  avatar_path: null;
  avatar_path_small: null;
  color: null;
  tie_count: null;
}
