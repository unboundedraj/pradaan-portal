import type { Database } from "./database";

// Table row shorthands
export type Profile = Database["public"]["Tables"]["pradaan_profiles"]["Row"];
export type DonorProfile = Database["public"]["Tables"]["pradaan_donor_profiles"]["Row"];
export type OrgProfile = Database["public"]["Tables"]["pradaan_org_profiles"]["Row"];
export type Drive = Database["public"]["Tables"]["pradaan_drives"]["Row"];
export type Donation = Database["public"]["Tables"]["pradaan_donations"]["Row"];
export type WalletTransaction = Database["public"]["Tables"]["pradaan_wallet_transactions"]["Row"];
export type PradaanPotEntry = Database["public"]["Tables"]["pradaan_pot_ledger"]["Row"];
export type Poll = Database["public"]["Tables"]["pradaan_polls"]["Row"];
export type PollOption = Database["public"]["Tables"]["pradaan_poll_options"]["Row"];
export type PollVote = Database["public"]["Tables"]["pradaan_poll_votes"]["Row"];

// View row shorthands
export type DonorAnalytics = Database["public"]["Views"]["pradaan_donor_analytics"]["Row"];

// Enum shorthands
export type UserRole = Database["public"]["Enums"]["pradaan_user_role"];
export type DriveStatus = Database["public"]["Enums"]["pradaan_drive_status"];
export type TransactionSource = Database["public"]["Enums"]["pradaan_transaction_source"];
export type PotLedgerType = Database["public"]["Enums"]["pradaan_pot_ledger_type"];
export type PollStatus = Database["public"]["Enums"]["pradaan_poll_status"];

// Composite domain types
export type DriveWithOrg = Drive & {
  pradaan_org_profiles: Pick<OrgProfile, "org_name" | "website">;
};

export type DonationWithDrive = Donation & {
  pradaan_drives: Pick<Drive, "title" | "target_amount">;
};

export type PollWithOptions = Poll & {
  pradaan_poll_options: PollOption[];
  my_vote: PollVote | null;
  vote_counts: Record<string, number>; // option_id → count
};

export type DonorDashboard = {
  profile: DonorProfile & Pick<Profile, "email" | "role">;
  analytics: DonorAnalytics;
  recentDonations: DonationWithDrive[];
};
