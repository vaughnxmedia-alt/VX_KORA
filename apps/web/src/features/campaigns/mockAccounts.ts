/** Mock accounts/clients for campaign filtering. JahKnowsPR (our own) first. TODO: Replace with Supabase orgs/clients. */
export interface MockAccount {
  id: string;
  name: string;
  /** Our own accounts vs client accounts */
  isOwn?: boolean;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  { id: "org-1", name: "JahKnowsPR", isOwn: true },
  { id: "org-2", name: "Client A", isOwn: false },
  { id: "org-3", name: "Client B", isOwn: false },
];

export function getAccountById(id: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((a) => a.id === id);
}
