export interface PlayerRequest {
  cursor: number;
  players: Player[];
  teams: Team[];
  stats: Stats;
}

export interface Stats {
  player_count: string;
  eliminated_count: string;
  bounty_count: string;
  safe_count: string;
  unpaid_count: string;
  location_disabled_count: string;
  active_player_count: string;
  join_request_count: string;
  target_count: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  created_by: string;
  leaderboard_position: null;
  points: number;
  player_limit: number;
  player_count: string;
  players: Player[];
}

export interface Player {
  id: string;
  subscription_level: number;
  first_name: string;
  last_name: string;
  avatar_path: null | string;
  avatar_path_medium: null;
  avatar_path_small: null | string;
  location_enabled: boolean;
  eliminated: boolean;
  eliminated_at: null;
  eliminated_by: null;
  is_bounty: boolean;
  is_safe: boolean;
  is_safe_expires_at: null;
  marked_safe: null;
  active_in_round: boolean;
  safe_from_purge: boolean;
  player_points: number;
  location_updated_at: Date | null;
  is_paid: boolean;
  marked_paid_by_name: string;
  elimination_count: number;
  points: number;
  player_leaderboard_position: null;
  team_name: string;
  team_color: string;
  team_id: string;
}

// Extended types based on base types
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
  myTeam: Player[]; // Now using base Player type
  latestActivity: LatestActivity;
  isLocationApprovalsPending: boolean;
  trialAvailable: boolean;
  trialExpiresAt: null;
  promptConversion: boolean;
  premiumCount: number;
  stats?: Stats; // Optional stats field
}

// CurrentPlayer extends Player with additional current user specific fields
export interface CurrentPlayer extends Player {
  team_created_by: string;
  is_vanished: boolean;
  is_vanished_expires_at: null;
  is_trace: boolean;
  is_trace_expires_at: null;
  is_bounty_expires_at: null;
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

export interface Round {
  id: string;
  idx: number;
  name: string;
  start_at: Date;
  end_at: Date;
  time_zone: string;
}

// Target extends Player with target-specific fields
export interface Target extends Player {
  target_id: string;
  user_id: string;
  city: string;
  region: string;
  user_location_updated_at: Date;
  battery_level: number;
  battery_is_charging: boolean;
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
