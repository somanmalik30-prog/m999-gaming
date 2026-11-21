import { useCallback, useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { AviatorGame } from './components/AviatorGame';
import { AviatorPredictor } from './components/AviatorPredictor';
import { GameLobby } from './components/GameLobby';
import { WalletModal } from './components/WalletModal';
import {
  DepositRequest,
  GameItem,
  PaymentSettings,
  UserProfile,
  WithdrawalRequest,
} from './types';

const DEFAULT_SETTINGS: PaymentSettings = {
  accountName: 'Muhammad Ali',
  accountNumber: '0300-1234567',
  paymentMethod: 'EasyPaisa / JazzCash',
  instructions:
    'Transfer exact amount to the account above, take a screenshot of the confirmation receipt, and upload it below.',
  minDeposit: 100,
  minWithdrawal: 500,
  updatedAt: '',
};

type AppRoute = 'game' | 'admin' | 'predictor';

function resolveRoute(): AppRoute {
  if (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash.startsWith('#/admin')
  ) {
    return 'admin';
  }
  if (
    window.location.pathname.startsWith('/predictor') ||
    window.location.hash.startsWith('#/predictor')
  ) {
    return 'predictor';
  }
  return 'game';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRoute());
  const [token, setToken] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('register');
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [activeAviator, setActiveAviator] = useState<GameItem | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRoute());
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  const fetchPublicSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.paymentSettings) setPaymentSettings(data.paymentSettings);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  const refreshPlayerState = useCallback(async () => {
    await fetchPublicSettings();
    if (!token) return;
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setToken(null);
        setUser(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setDeposits(data.history?.deposits ?? []);
        setWithdrawals(data.history?.withdrawals ?? []);
        if (data.paymentSettings) setPaymentSettings(data.paymentSettings);
      }
    } catch {
      // ignore transient network issue
    }
  }, [fetchPublicSettings, token]);

  useEffect(() => {
    refreshPlayerState();
    const timer = window.setInterval(refreshPlayerState, 5000);
    return () => clearInterval(timer);
  }, [refreshPlayerState]);

  const navigateTo = (target: AppRoute) => {
    const nextPath =
      target === 'admin' ? '/admin' : target === 'predictor' ? '/predictor' : '/';
    window.history.pushState({}, '', nextPath);
    setRoute(target);
  };

  if (route === 'admin') {
    return (
      <AdminPanel
        adminToken={adminToken}
        onAdminTokenChange={setAdminToken}
        onNavigateGame={() => navigateTo('game')}
        onNavigatePredictor={() => navigateTo('predictor')}
      />
    );
  }

  if (route === 'predictor') {
    return (
      <AviatorPredictor
        adminToken={adminToken}
        onAdminTokenChange={setAdminToken}
        onNavigateGame={() => navigateTo('game')}
        onNavigateAdmin={() => navigateTo('admin')}
      />
    );
  }

  return (
    <>
      {activeAviator ? (
        <AviatorGame
          variantTitle={activeAviator.provider}
          token={token}
          user={user}
          onBalanceChange={(newBal) =>
            setUser((prev) => (prev ? { ...prev, balance: newBal } : prev))
          }
          onOpenDeposit={() => {
            setWalletTab('deposit');
            setWalletOpen(true);
          }}
          onRequireAuth={() => {
            setAuthInitialMode('register');
            setAuthModalOpen(true);
          }}
          onBack={() => setActiveAviator(null)}
        />
      ) : (
        <GameLobby
          user={user}
          paymentSettings={paymentSettings}
          deposits={deposits}
          withdrawals={withdrawals}
          onRefresh={refreshPlayerState}
          onOpenWallet={(tab) => {
            setWalletTab(tab);
            setWalletOpen(true);
          }}
          onOpenAuth={(mode = 'register') => {
            setAuthInitialMode(mode);
            setAuthModalOpen(true);
          }}
          onLaunchAviator={(game) => setActiveAviator(game)}
          onLogout={() => {
            setToken(null);
            setUser(null);
            setDeposits([]);
            setWithdrawals([]);
          }}
        />
      )}

      <AuthModal
        open={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(newToken, newUser) => {
          setToken(newToken);
          setUser(newUser);
        }}
      />

      <WalletModal
        open={walletOpen}
        initialTab={walletTab}
        onClose={() => setWalletOpen(false)}
        token={token}
        user={user}
        paymentSettings={paymentSettings}
        onSuccess={refreshPlayerState}
        onRequireAuth={() => {
          setWalletOpen(false);
          setAuthInitialMode('register');
          setAuthModalOpen(true);
        }}
      />
    </>
  );
}
