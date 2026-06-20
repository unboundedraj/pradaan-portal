import type { Database } from "./database";

// Table row shorthands
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DonorProfile = Database["public"]["Tables"]["donor_profiles"]["Row"];
export type OrgProfile = Database["public"]["Tables"]["org_profiles"]["Row"];
export type Drive = Database["public"]["Tables"]["drives"]["Row"];
export type Donation = Database["public"]["Tables"]["donations"]["Row"];
export type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];
export type PradaanPotEntry = Database["public"]["Tables"]["pradaan_pot_ledger"]["Row"];
export type Poll = Database["public"]["Tables"]["polls"]["Row"];
export type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
export type PollVote = Database["public"]["Tables"]["poll_votes"]["Row"];

// View row shorthands
export type DonorAnalytics = Database["public"]["Views"]["donor_analytics"]["Row"];

// Enum shorthands
export type UserRole = Database["public"]["Enums"]["user_role"];
export type DriveStatus = Database["public"]["Enums"]["drive_status"];
export type TransactionSource = Database["public"]["Enums"]["transaction_source"];
export type PotLedgerType = Database["public"]["Enums"]["pot_ledger_type"];
export type PollStatus = Database["public"]["Enums"]["poll_status"];

// Composite domain types
export type DriveWithOrg = Drive & {
  org_profiles: Pick<OrgProfile, "org_name" | "website">;
};

export type DonationWithDrive = Donation & {
  drives: Pick<Drive, "title" | "target_amount">;
};

export type PollWithOptions = Poll & {
  poll_options: PollOption[];
  my_vote: PollVote | null;
  vote_counts: Record<string, number>; // option_id → count
};

export type DonorDashboard = {
  profile: DonorProfile & Pick<Profile, "email" | "role">;
  analytics: DonorAnalytics;
  recentDonations: DonationWithDrive[];
};
