import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  balance: number;
  createdAt: string;
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

export interface DepositRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  senderName: string;
  transactionRef: string;
  screenshotData: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AviatorBetRecord {
  id: string;
  userId: string;
  amount: number;
  cashedOut: boolean;
  payout: number;
  createdAt: string;
}

interface StoreData {
  adminCredentialHash: string | null;
  paymentSettings: PaymentSettings;
  users: StoredUser[];
  deposits: DepositRecord[];
  withdrawals: WithdrawalRecord[];
  aviatorBets: AviatorBetRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'm999_store.json');

// Signing secret stays strictly in process memory or process.env
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const DEFAULT_STORE: StoreData = {
  adminCredentialHash: null,
  paymentSettings: {
    accountName: 'Muhammad Ali',
    accountNumber: '0300-1234567',
    paymentMethod: 'EasyPaisa / JazzCash',
    instructions:
      'Transfer exact amount to the account above, take a screenshot of the confirmation receipt, and upload it below.',
    minDeposit: 100,
    minWithdrawal: 500,
    updatedAt: new Date().toISOString(),
  },
  users: [],
  deposits: [],
  withdrawals: [],
  aviatorBets: [],
};

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
      return structuredClone(DEFAULT_STORE);
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      adminCredentialHash: parsed.adminCredentialHash ?? null,
      paymentSettings: {
        ...DEFAULT_STORE.paymentSettings,
        ...(parsed.paymentSettings ?? {}),
      },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
      withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
      aviatorBets: Array.isArray(parsed.aviatorBets) ? parsed.aviatorBets : [],
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

let store: StoreData = loadStore();

function persistStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export interface TokenPayload {
  sub: string;
  role: 'user' | 'admin';
  exp: number;
}

export function signToken(sub: string, role: 'user' | 'admin'): string {
  const payload: TokenPayload = {
    sub,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (!payload.sub || !payload.role || typeof payload.exp !== 'number') {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getAdminAuthStatus(): { configured: boolean; envOverride: boolean } {
  const envCode = process.env.ADMIN_PASSCODE?.trim() ?? '';
  return {
    configured: Boolean(store.adminCredentialHash) || envCode.length > 0,
    envOverride: false,
  };
}

export function setupAdminPasscode(passcode: string): boolean {
  const envCode = process.env.ADMIN_PASSCODE?.trim() ?? '';
  if (envCode.length > 0 || store.adminCredentialHash) {
    return false;
  }
  store.adminCredentialHash = hashPassword(passcode);
  persistStore();
  return true;
}

export function verifyAdminLogin(passcode: string): boolean {
  if (store.adminCredentialHash) {
    return verifyPassword(passcode, store.adminCredentialHash);
  }
  const envCode = process.env.ADMIN_PASSCODE?.trim() ?? '';
  if (envCode.length > 0) {
    const a = Buffer.from(passcode, 'utf8');
    const b = Buffer.from(envCode, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  return false;
}

export function changeAdminPasscode(
  currentPasscode: string,
  newPasscode: string
): { ok?: boolean; error?: string } {
  if (!verifyAdminLogin(currentPasscode)) {
    return { error: 'Current admin password is incorrect.' };
  }
  const trimmedNew = newPasscode.trim();
  if (trimmedNew.length < 6 || trimmedNew.length > 100) {
    return { error: 'New admin password must be between 6 and 100 characters.' };
  }
  if (trimmedNew === currentPasscode.trim()) {
    return { error: 'New password must be different from your current password.' };
  }
  store.adminCredentialHash = hashPassword(trimmedNew);
  persistStore();
  return { ok: true };
}

export function getPaymentSettings(): PaymentSettings {
  return store.paymentSettings;
}

export function updatePaymentSettings(next: Partial<PaymentSettings>): PaymentSettings {
  store.paymentSettings = {
    accountName: (next.accountName ?? store.paymentSettings.accountName).trim(),
    accountNumber: (next.accountNumber ?? store.paymentSettings.accountNumber).trim(),
    paymentMethod: (next.paymentMethod ?? store.paymentSettings.paymentMethod).trim(),
    instructions: (next.instructions ?? store.paymentSettings.instructions).trim(),
    minDeposit:
      typeof next.minDeposit === 'number' && next.minDeposit >= 10
        ? Math.floor(next.minDeposit)
        : store.paymentSettings.minDeposit,
    minWithdrawal:
      typeof next.minWithdrawal === 'number' && next.minWithdrawal >= 10
        ? Math.floor(next.minWithdrawal)
        : store.paymentSettings.minWithdrawal,
    updatedAt: new Date().toISOString(),
  };
  persistStore();
  return store.paymentSettings;
}

export function registerUser(
  name: string,
  phone: string,
  password: string
): { user?: StoredUser; error?: string } {
  const cleanPhone = phone.replace(/\s+/g, '');
  if (store.users.some((u) => u.phone === cleanPhone)) {
    return { error: 'This phone number is already registered. Please sign in.' };
  }
  const user: StoredUser = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    name: name.trim(),
    phone: cleanPhone,
    passwordHash: hashPassword(password),
    balance: 0,
    createdAt: new Date().toISOString(),
  };
  store.users.unshift(user);
  persistStore();
  return { user };
}

export function loginUser(phone: string, password: string): StoredUser | null {
  const cleanPhone = phone.replace(/\s+/g, '');
  const user = store.users.find((u) => u.phone === cleanPhone);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function getUserById(userId: string): StoredUser | undefined {
  return store.users.find((u) => u.id === userId);
}

export function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    balance: roundMoney(user.balance),
    createdAt: user.createdAt,
  };
}

export function createDepositRequest(params: {
  user: StoredUser;
  amount: number;
  senderName: string;
  transactionRef: string;
  screenshotData: string;
}): DepositRecord {
  const record: DepositRecord = {
    id: `dep_${crypto.randomBytes(6).toString('hex')}`,
    userId: params.user.id,
    userName: params.user.name,
    userPhone: params.user.phone,
    amount: roundMoney(params.amount),
    senderName: params.senderName.trim(),
    transactionRef: params.transactionRef.trim(),
    screenshotData: params.screenshotData,
    status: 'pending',
    adminNote: '',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };
  store.deposits.unshift(record);
  persistStore();
  return record;
}

export function reviewDepositRequest(
  depositId: string,
  decision: 'approved' | 'rejected',
  adminNote: string
): { deposit?: DepositRecord; error?: string } {
  const dep = store.deposits.find((d) => d.id === depositId);
  if (!dep) return { error: 'Deposit request not found.' };
  if (dep.status !== 'pending') {
    return { error: `Request is already ${dep.status}.` };
  }

  dep.status = decision;
  dep.adminNote = adminNote.trim();
  dep.reviewedAt = new Date().toISOString();

  if (decision === 'approved') {
    const user = store.users.find((u) => u.id === dep.userId);
    if (user) {
      user.balance = roundMoney(user.balance + dep.amount);
    }
  }

  persistStore();
  return { deposit: dep };
}

export function createWithdrawalRequest(params: {
  user: StoredUser;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
}): { withdrawal?: WithdrawalRecord; balance?: number; error?: string } {
  const amount = roundMoney(params.amount);
  if (amount > params.user.balance) {
    return { error: 'Insufficient wallet balance.' };
  }

  // Hold balance immediately to prevent double-withdrawals
  params.user.balance = roundMoney(params.user.balance - amount);

  const record: WithdrawalRecord = {
    id: `wd_${crypto.randomBytes(6).toString('hex')}`,
    userId: params.user.id,
    userName: params.user.name,
    userPhone: params.user.phone,
    amount,
    method: params.method.trim(),
    accountName: params.accountName.trim(),
    accountNumber: params.accountNumber.trim(),
    status: 'pending',
    adminNote: '',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };
  store.withdrawals.unshift(record);
  persistStore();
  return { withdrawal: record, balance: params.user.balance };
}

export function reviewWithdrawalRequest(
  withdrawalId: string,
  decision: 'approved' | 'rejected',
  adminNote: string
): { withdrawal?: WithdrawalRecord; error?: string } {
  const wd = store.withdrawals.find((w) => w.id === withdrawalId);
  if (!wd) return { error: 'Withdrawal request not found.' };
  if (wd.status !== 'pending') {
    return { error: `Withdrawal is already ${wd.status}.` };
  }

  wd.status = decision;
  wd.adminNote = adminNote.trim();
  wd.reviewedAt = new Date().toISOString();

  if (decision === 'rejected') {
    // Refund held amount back to user
    const user = store.users.find((u) => u.id === wd.userId);
    if (user) {
      user.balance = roundMoney(user.balance + wd.amount);
    }
  }

  persistStore();
  return { withdrawal: wd };
}

export function placeAviatorBet(
  user: StoredUser,
  amount: number
): { bet?: AviatorBetRecord; balance?: number; error?: string } {
  const cleanAmount = roundMoney(amount);
  if (cleanAmount < 10) {
    return { error: 'Minimum Aviator bet is Rs 10.' };
  }
  if (cleanAmount > user.balance) {
    return { error: 'Insufficient balance. Please deposit first.' };
  }

  user.balance = roundMoney(user.balance - cleanAmount);
  const bet: AviatorBetRecord = {
    id: `bet_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    amount: cleanAmount,
    cashedOut: false,
    payout: 0,
    createdAt: new Date().toISOString(),
  };
  store.aviatorBets.unshift(bet);
  if (store.aviatorBets.length > 500) {
    store.aviatorBets = store.aviatorBets.slice(0, 500);
  }
  persistStore();
  return { bet, balance: user.balance };
}

// Server-Authoritative Live Aviator Round Engine
export type AviatorPhase = 'BETTING' | 'FLYING' | 'CRASHED';

function generateCrashPoint(): number {
  const r = Math.random();
  if (r < 0.08) return 1.0;
  if (r < 0.45) return Number((1.15 + Math.random() * 1.05).toFixed(2));
  if (r < 0.82) return Number((2.2 + Math.random() * 3.4).toFixed(2));
  if (r < 0.96) return Number((5.6 + Math.random() * 8.5).toFixed(2));
  return Number((14.5 + Math.random() * 20).toFixed(2));
}

const BETTING_MS = 5000;
const CRASHED_MS = 3000;
const GROWTH_RATE = 0.115;

interface AviatorEngine {
  roundId: number;
  phase: AviatorPhase;
  phaseStartedAt: number;
  crashPoint: number;
  nextCrashPoint: number;
  history: number[];
}

const aviatorEngine: AviatorEngine = {
  roundId: 1001,
  phase: 'BETTING',
  phaseStartedAt: Date.now(),
  crashPoint: generateCrashPoint(),
  nextCrashPoint: generateCrashPoint(),
  history: [2.41, 1.38, 6.14, 1.09, 3.72, 1.85, 11.4, 1.63],
};

function getFlightDurationMs(crashPoint: number): number {
  if (crashPoint <= 1.0) return 350;
  return Math.max(350, Math.round((Math.log(crashPoint) / GROWTH_RATE) * 1000));
}

function advanceAviatorEngine(): void {
  const now = Date.now();
  let guard = 0;
  while (guard < 25) {
    guard++;
    if (aviatorEngine.phase === 'BETTING') {
      if (now - aviatorEngine.phaseStartedAt >= BETTING_MS) {
        aviatorEngine.phase = 'FLYING';
        aviatorEngine.phaseStartedAt += BETTING_MS;
      } else {
        break;
      }
    } else if (aviatorEngine.phase === 'FLYING') {
      const flightMs = getFlightDurationMs(aviatorEngine.crashPoint);
      if (now - aviatorEngine.phaseStartedAt >= flightMs) {
        aviatorEngine.phase = 'CRASHED';
        aviatorEngine.phaseStartedAt += flightMs;
        aviatorEngine.history = [aviatorEngine.crashPoint, ...aviatorEngine.history].slice(0, 16);
      } else {
        break;
      }
    } else {
      if (now - aviatorEngine.phaseStartedAt >= CRASHED_MS) {
        aviatorEngine.roundId += 1;
        aviatorEngine.crashPoint = aviatorEngine.nextCrashPoint;
        aviatorEngine.nextCrashPoint = generateCrashPoint();
        aviatorEngine.phase = 'BETTING';
        aviatorEngine.phaseStartedAt += CRASHED_MS;
      } else {
        break;
      }
    }
  }
}

function getCurrentMultiplier(): number {
  if (aviatorEngine.phase === 'BETTING') return 1.0;
  if (aviatorEngine.phase === 'CRASHED') return aviatorEngine.crashPoint;
  const sec = Math.max(0, (Date.now() - aviatorEngine.phaseStartedAt) / 1000);
  const raw = Number(Math.exp(GROWTH_RATE * sec).toFixed(2));
  return Math.min(raw, aviatorEngine.crashPoint);
}

export function getPublicAviatorState() {
  advanceAviatorEngine();
  const now = Date.now();
  const countdown =
    aviatorEngine.phase === 'BETTING'
      ? Math.max(0, Number(((BETTING_MS - (now - aviatorEngine.phaseStartedAt)) / 1000).toFixed(1)))
      : 0;

  return {
    roundId: aviatorEngine.roundId,
    phase: aviatorEngine.phase,
    countdown,
    multiplier: getCurrentMultiplier(),
    flightElapsedMs: aviatorEngine.phase === 'FLYING' ? Math.max(0, now - aviatorEngine.phaseStartedAt) : 0,
    crashedAt: aviatorEngine.phase === 'CRASHED' ? aviatorEngine.crashPoint : null,
    history: aviatorEngine.history,
  };
}

export function getAdminPredictorState() {
  const pub = getPublicAviatorState();
  return {
    ...pub,
    activeRoundCrashPoint: aviatorEngine.crashPoint,
    nextRoundId: aviatorEngine.roundId + 1,
    nextRoundCrashPoint: aviatorEngine.nextCrashPoint,
    safeCashout: Number(Math.max(1.0, aviatorEngine.crashPoint * 0.85).toFixed(2)),
    nextSafeCashout: Number(Math.max(1.0, aviatorEngine.nextCrashPoint * 0.85).toFixed(2)),
  };
}

export function setAdminNextCrash(crashMultiplier: number) {
  advanceAviatorEngine();
  const clean = Number(Math.max(1.0, Math.min(100, crashMultiplier)).toFixed(2));
  if (aviatorEngine.phase === 'BETTING') {
    aviatorEngine.crashPoint = clean;
  } else {
    aviatorEngine.nextCrashPoint = clean;
  }
  return getAdminPredictorState();
}

export function cashoutAviatorBet(
  user: StoredUser,
  betId: string,
  clientMultiplier: number
): { payout?: number; balance?: number; multiplier?: number; error?: string } {
  advanceAviatorEngine();
  const bet = store.aviatorBets.find((b) => b.id === betId && b.userId === user.id);
  if (!bet) return { error: 'Bet ticket not found.' };
  if (bet.cashedOut) return { error: 'Bet already cashed out.' };
  if (aviatorEngine.phase !== 'FLYING') {
    return { error: 'Round already flew away before cashout.' };
  }

  const serverMult = getCurrentMultiplier();
  const effectiveMult =
    Number.isFinite(clientMultiplier) && clientMultiplier >= 1.0 && clientMultiplier <= serverMult
      ? Number(clientMultiplier.toFixed(2))
      : serverMult;

  if (effectiveMult >= aviatorEngine.crashPoint) {
    return { error: 'Plane already crashed.' };
  }

  const payout = roundMoney(bet.amount * effectiveMult);
  bet.cashedOut = true;
  bet.payout = payout;
  user.balance = roundMoney(user.balance + payout);
  persistStore();
  return { payout, balance: user.balance, multiplier: effectiveMult };
}

export function adjustUserBalance(
  userId: string,
  delta: number
): { user?: ReturnType<typeof sanitizeUser>; error?: string } {
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { error: 'User not found.' };
  const next = roundMoney(user.balance + delta);
  if (next < 0) return { error: 'Resulting balance cannot be negative.' };
  user.balance = next;
  persistStore();
  return { user: sanitizeUser(user) };
}

export function getUserHistory(userId: string) {
  return {
    deposits: store.deposits.filter((d) => d.userId === userId),
    withdrawals: store.withdrawals.filter((w) => w.userId === userId),
  };
}

export function getAdminDashboardData() {
  const pendingDeposits = store.deposits.filter((d) => d.status === 'pending').length;
  const pendingWithdrawals = store.withdrawals.filter((w) => w.status === 'pending').length;
  const totalApprovedDeposits = roundMoney(
    store.deposits
      .filter((d) => d.status === 'approved')
      .reduce((sum, d) => sum + d.amount, 0)
  );
  const totalApprovedWithdrawals = roundMoney(
    store.withdrawals
      .filter((w) => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0)
  );

  return {
    stats: {
      pendingDeposits,
      pendingWithdrawals,
      totalApprovedDeposits,
      totalApprovedWithdrawals,
      totalUsers: store.users.length,
    },
    deposits: store.deposits,
    withdrawals: store.withdrawals,
    users: store.users.map(sanitizeUser),
    paymentSettings: store.paymentSettings,
  };
}
