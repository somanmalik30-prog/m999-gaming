export type GameCategory = 'hot' | 'mini' | 'slot' | 'cards' | 'fishing';

export interface GameItem {
  id: string;
  title: string;
  provider: string;
  category: Exclude<GameCategory, 'hot'>;
  isHot: boolean;
  playable: boolean;
  artVariant: string;
  badgeText?: string;
}

export interface PaymentSettings {
  accountName: string;
  accountNumber: string;
  paymentMethod: string;
  instructions: string;
  minDeposit: number;
  minWithdrawal: number;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  balance: number;
  createdAt: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  senderName: string;
  transactionRef: string;
  screenshotData: string;
  status: RequestStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  status: RequestStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminDashboardData {
  stats: {
    pendingDeposits: number;
    pendingWithdrawals: number;
    totalApprovedDeposits: number;
    totalApprovedWithdrawals: number;
    totalUsers: number;
  };
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  users: UserProfile[];
  paymentSettings: PaymentSettings;
}
