export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  family_id: string;
}
