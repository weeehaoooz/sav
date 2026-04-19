export type AccountType = 'primary' | 'partner' | 'child_minor' | 'child_teen' | 'dependent';
export type AccountRole = 'owner' | 'co_owner' | 'viewer' | 'trustee';

export interface Account {
  id: number;
  user: number;
  display_name: string;
  account_type: AccountType;
  role: AccountRole;
  avatar_color: string;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}
