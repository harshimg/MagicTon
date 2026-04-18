'use client';

import { useState, useEffect, useCallback } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { DEX, pTON } from '@ston-fi/sdk';
import { TonClient, toNano } from '@ton/ton';

const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

type Token = { symbol: string; name: string; icon: string; address: string; decimals: number; verified: boolean; };
type SwapRecord = { from: string; to: string; fromAmount: string; toAmount: string; time: string; };
type Theme = 'dark' | 'light' | 'magic';

const DEFAULT_TOKENS: Token[] = [
  { symbol: 'TON', name: 'Toncoin', icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png', address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', decimals: 9, verified: true },
  { symbol: 'USDt', name: 'Tether USD', icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6, verified: true },
  { symbol: 'STON', name: 'STON.fi', icon: 'https://assets.coingecko.com/coins/images/31233/standard/STON.jpg?1696530059', address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', decimals: 9, verified: true },
  { symbol: 'NOT', name: 'Notcoin', icon: 'https://assets.coingecko.com/coins/images/33453/standard/rFmThDiD_400x400.jpg?1701876350', address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', decimals: 9, verified: true },
  { symbol: 'GOMINING', name: 'GoMining Token', icon: 'https://assets.coingecko.com/coins/images/15662/standard/GoMining_Logo.webp?1769225542', address: 'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8', decimals: 9, verified: true },
];

const BANNER_TOKENS = [
  { symbol: 'TON', coingecko: 'the-open-network', icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png' },
  { symbol: 'STON', coingecko: 'ston-2', icon: 'https://assets.coingecko.com/coins/images/31233/standard/STON.jpg?1696530059' },
  { symbol: 'NOT', coingecko: 'notcoin', icon: 'https://assets.coingecko.com/coins/images/33453/standard/rFmThDiD_400x400.jpg?1701876350' },
  { symbol: 'GOMINING', coingecko: 'gmt-token', icon: 'https://assets.coingecko.com/coins/images/15662/standard/GoMining_Logo.webp?1769225542' },
  { symbol: 'BTC', coingecko: 'bitcoin', icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { symbol: 'ETH', coingecko: 'ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
];

// ✅ TokenSelect is OUTSIDE Home — fixes cursor bug
const TokenSelect = ({ value, onChange, tokens, setTokens, setShowBadgeInfo }: {
  value: Token; onChange: (t: Token) => void;
  tokens: Token[]; setTokens: (fn: (prev: Token[]) => Token[]) => void;
  setShowBadgeInfo: (v: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [contractInput, setContractInput] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const handleAddCustomToken = async () => {
    if (!contractInput.trim()) return;
    setFetchingToken(true);
    setFetchError('');
    try {
      const res = await fetch(`/api/token?address=${contractInput.trim()}`);
      const data = await res.json();
      if (data.error) { setFetchError(data.error); setFetchingToken(false); return; }
      const newToken: Token = {
        symbol: data.symbol, name: data.name,
        icon: data.image || 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
        address: contractInput.trim(), decimals: data.decimals ?? 9, verified: false,
      };
      setTokens(prev => prev.find(t => t.address === newToken.address) ? prev : [...prev, newToken]);
      onChange(newToken); setOpen(false); setContractInput('');
    } catch { setFetchError('Failed to fetch token info'); }
    setFetchingToken(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl px-3 py-2 font-bold outline-none cursor-pointer">
        <img src={value.icon} alt={value.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span>{value.symbol}</span>
        {value.verified && (
          <span onClick={(e) => { e.stopPropagation(); setShowBadgeInfo(true); }} className="text-blue-400 text-xs cursor-pointer hover:text-blue-300">✓</span>
        )}
        <span className="text-gray-400 text-sm">▼</span>
      </button>
      {open && (
        <div className="absolute top-12 left-0 bg-gray-800 border border-gray-600 rounded-2xl overflow-hidden z-50 w-64 shadow-xl max-h-64 overflow-y-auto">
          {tokens.map(t => (
            <button key={t.address} onClick={() => { onChange(t); setOpen(false); }} className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-700 text-white font-bold">
              <img src={t.icon} alt={t.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span>{t.symbol}</span>
              {t.verified ? <span className="text-blue-400 text-xs">✓</span> : <span className="text-yellow-400 text-xs">⚠️</span>}
            </button>
          ))}
          <div className="border-t border-gray-700 p-3">
            <p className="text-gray-400 text-xs mb-2 font-bold">+ Add Custom Token</p>
            <input type="text" placeholder="Paste contract address..." value={contractInput}
              onChange={(e) => setContractInput(e.target.value)}
              className="w-full bg-gray-700 text-white text-xs rounded-xl px-3 py-2 outline-none placeholder-gray-500 mb-2" />
            {fetchError && <p className="text-red-400 text-xs mb-2">{fetchError}</p>}
            <button onClick={handleAddCustomToken} disabled={fetchingToken || !contractInput.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl py-1.5 transition-all">
              {fetchingToken ? 'Fetching...' : 'Add Token'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'lucky'>('swap');
  const [theme, setTheme] = useState<Theme>('dark');
  const [tokens, setTokens] = useState<Token[]>(DEFAULT_TOKENS);
  const [fromToken, setFromToken] = useState(DEFAULT_TOKENS[0]);
  const [toToken, setToToken] = useState(DEFAULT_TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [bannerPrices, setBannerPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [slippage, setSlippage] = useState('1');
  const [showSlippage, setShowSlippage] = useState(false);
  const [successData, setSuccessData] = useState<{ fromAmount: string; fromSymbol: string; toAmount: string; toSymbol: string; txHash?: string } | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [magicSwapEffect, setMagicSwapEffect] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Theme classes
  const th = {
    dark: {
      bg: 'bg-black', card: 'bg-gray-900', inner: 'bg-gray-800',
      text: 'text-white', sub: 'text-gray-400', border: 'border-purple-500/30',
      nav: 'bg-gray-900/90', btn: 'bg-gray-700', accent: 'text-purple-400',
      gradient: 'from-purple-900/20 via-black to-blue-900/20',
    },
    light: {
      bg: 'bg-gray-100', card: 'bg-white', inner: 'bg-gray-100',
      text: 'text-gray-900', sub: 'text-gray-500', border: 'border-purple-300',
      nav: 'bg-white/95', btn: 'bg-gray-200', accent: 'text-purple-600',
      gradient: 'from-purple-100 via-white to-blue-100',
    },
    magic: {
      bg: 'bg-[#020b18]', card: 'bg-[#041428]/90', inner: 'bg-[#051e38]/80',
      text: 'text-cyan-100', sub: 'text-cyan-400/70', border: 'border-cyan-400/30',
      nav: 'bg-[#020b18]/95', btn: 'bg-[#041428]', accent: 'text-cyan-300',
      gradient: 'from-[#020b18] via-[#041428] to-[#020b18]',
    },
  }[theme];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        const prices: Record<string, { price: number; change: number }> = {};
        const mapping: Record<string, string> = { 'the-open-network': 'TON', 'ston-2': 'STON', 'notcoin': 'NOT', 'gmt-token': 'GOMINING', 'bitcoin': 'BTC', 'ethereum': 'ETH' };
        Object.entries(mapping).forEach(([id, symbol]) => { if (data[id]) prices[symbol] = { price: data[id].usd, change: data[id].usd_24h_change }; });
        setBannerPrices(prices);
      } catch {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!wallet?.account?.address) { setBalances({}); return; }
    const fetchBalances = async () => {
      try {
        const { Address } = await import('@ton/ton');
        const userAddr = Address.parse(wallet.account.address);
        const newBalances: Record<string, string> = {};
        const tonRes = await fetch(`/api/balance?owner_address=${userAddr.toString()}`);
        const tonData = await tonRes.json();
        newBalances['TON'] = (Number(tonData.result) / 1e9).toFixed(2);
        for (const token of tokens.filter(t => t.symbol !== 'TON')) {
          try {
            const res = await fetch(`/api/balance?owner_address=${userAddr.toString()}&jetton_address=${token.address}`);
            const data = await res.json();
            const bal = data?.jetton_wallets?.[0]?.balance ?? '0';
            newBalances[token.symbol] = (Number(bal) / Math.pow(10, token.decimals)).toFixed(2);
          } catch { newBalances[token.symbol] = '0.00'; }
        }
        setBalances(newBalances);
      } catch { setBalances({}); }
    };
    fetchBalances();
  }, [wallet, tokens]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const res = await fetch('/api/swap', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerAddress: fromToken.address, askAddress: toToken.address, amount, decimals: fromToken.decimals, slippage }),
        });
        const result = await res.json();
        const outAmount = parseInt(result.askUnits) / Math.pow(10, toToken.decimals);
        setQuote(outAmount.toFixed(6));
      } catch { setQuote(null); }
      setLoadingQuote(false);
    };
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken, refreshTick, slippage]);

  useEffect(() => {
    const saved = localStorage.getItem('magicton_history');
    if (saved) setSwapHistory(JSON.parse(saved));
  }, []);

  const saveSwap = (record: SwapRecord) => {
    const updated = [record, ...swapHistory].slice(0, 10);
    setSwapHistory(updated);
    localStorage.setItem('magicton_history', JSON.stringify(updated));
  };

  const handleMagicSwap = async () => {
    if (!tonConnectUI.connected) { tonConnectUI.openModal(); return; }
    if (!amount || parseFloat(amount) <= 0) { alert('Enter an amount!'); return; }
    setLoading(true);
    try {
      const router = tonClient.open(new DEX.v1.Router());
      const userAddress = wallet!.account.address;
      const offerAmount = toNano(amount);
      let txParams;
      if (fromToken.symbol === 'TON') {
        txParams = await router.getSwapTonToJettonTxParams({ userWalletAddress: userAddress, proxyTon: new pTON.v1(), offerAmount, askJettonAddress: toToken.address, minAskAmount: '1', queryId: Date.now() });
      } else if (toToken.symbol === 'TON') {
        txParams = await router.getSwapJettonToTonTxParams({ userWalletAddress: userAddress, offerJettonAddress: fromToken.address, offerAmount, proxyTon: new pTON.v1(), minAskAmount: '1', queryId: Date.now() });
      } else {
        txParams = await router.getSwapJettonToJettonTxParams({ userWalletAddress: userAddress, offerJettonAddress: fromToken.address, offerAmount, askJettonAddress: toToken.address, minAskAmount: '1', queryId: Date.now() });
      }
      await tonConnectUI.sendTransaction({ validUntil: Math.floor(Date.now() / 1000) + 600, messages: [{ address: txParams.to.toString(), amount: txParams.value.toString(), payload: txParams.body?.toBoc().toString('base64') }] });
      saveSwap({ from: fromToken.symbol, to: toToken.symbol, fromAmount: amount, toAmount: quote ?? '?', time: new Date().toLocaleString() });
      if (theme === 'magic') { setMagicSwapEffect(true); setTimeout(() => setMagicSwapEffect(false), 3000); }
      setSuccessData({ fromAmount: amount, fromSymbol: fromToken.symbol, toAmount: quote ?? '?', toSymbol: toToken.symbol, txHash: wallet?.account?.address });
    } catch (e: any) { alert('Swap failed: ' + (e?.message || 'Unknown error')); }
    setLoading(false);
  };

  const handleLuckySwap = () => {
    const available = tokens.filter(t => parseFloat(balances[t.symbol] ?? '0') > 0);
    if (available.length === 0) { alert('No token balance found!'); return; }
    const from = available[Math.floor(Math.random() * available.length)];
    const others = tokens.filter(t => t.symbol !== from.symbol);
    const to = others[Math.floor(Math.random() * others.length)];
    setFromToken(from); setToToken(to); setAmount((parseFloat(balances[from.symbol] ?? '0') * 0.1).toFixed(4));
  };

  const handleFlip = () => { setFromToken(toToken); setToToken(fromToken); setQuote(null); setAmount(''); };

  const isLight = theme === 'light';
  const isMagic = theme === 'magic';

  return (
    <main className={`min-h-screen ${th.bg} flex flex-col items-center transition-all duration-500`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${th.gradient} transition-all duration-500`} />

      {/* Magic mode underwater effects */}
      {isMagic && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#020b18] via-[#041e3a] to-[#020b18] opacity-90" />
          {/* Floating bubbles */}
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-cyan-400/20 bg-cyan-400/5 animate-bubble"
              style={{ left: `${Math.random() * 100}%`, width: `${8 + Math.random() * 20}px`, height: `${8 + Math.random() * 20}px`, animationDelay: `${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 8}s`, bottom: '-50px' }} />
          ))}
          {/* Light rays */}
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-cyan-400/20 to-transparent animate-pulse" />
          <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-blue-400/15 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-cyan-300/10 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-cyan-300/40 animate-float"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s` }} />
          ))}
          {/* Seaweed */}
          <div className="absolute bottom-0 left-8 w-3 h-32 bg-gradient-to-t from-teal-600/40 to-transparent rounded-full animate-sway" />
          <div className="absolute bottom-0 left-16 w-2 h-24 bg-gradient-to-t from-teal-500/30 to-transparent rounded-full animate-sway" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 right-8 w-3 h-40 bg-gradient-to-t from-teal-600/40 to-transparent rounded-full animate-sway" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 right-20 w-2 h-28 bg-gradient-to-t from-teal-500/30 to-transparent rounded-full animate-sway" style={{ animationDelay: '0.3s' }} />
        </div>
      )}

      {/* Magic swap effect overlay */}
      {magicSwapEffect && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="text-8xl animate-spin-slow">🌊</div>
          <div className="absolute inset-0 bg-cyan-400/10 animate-pulse" />
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute text-2xl animate-explode"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s` }}>
              {['✨','🫧','💎','🌊','⭐','🐠','🦀','🐚'][Math.floor(Math.random() * 8)]}
            </div>
          ))}
        </div>
      )}

      {/* Navbar */}
      <div className={`w-full ${th.nav} border-b ${isLight ? 'border-gray-200' : isMagic ? 'border-cyan-500/20' : 'border-gray-800'} relative z-20 backdrop-blur-sm`}>
        {/* Price Banner */}
        <div className={`w-full overflow-hidden py-1.5 ${isLight ? 'bg-gray-50' : isMagic ? 'bg-cyan-950/30' : 'bg-black/50'} border-b ${isLight ? 'border-gray-200' : isMagic ? 'border-cyan-500/10' : 'border-gray-800'}`}>
          <div className="flex animate-marquee gap-8 whitespace-nowrap">
            {[...BANNER_TOKENS, ...BANNER_TOKENS].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <img src={t.icon} alt={t.symbol} className="w-4 h-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className={`font-bold ${isMagic ? 'text-cyan-200' : th.text}`}>{t.symbol}</span>
                <span className={isMagic ? 'text-cyan-400/70' : 'text-gray-400'}>${bannerPrices[t.symbol]?.price ? bannerPrices[t.symbol].price < 0.01 ? bannerPrices[t.symbol].price.toFixed(6) : bannerPrices[t.symbol].price.toFixed(2) : '...'}</span>
                <span className={bannerPrices[t.symbol]?.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {bannerPrices[t.symbol]?.change >= 0 ? '+' : ''}{bannerPrices[t.symbol]?.change?.toFixed(2) ?? '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src="/MagicTon_logo.png" alt="MagicTon" className={`w-9 h-9 rounded-xl ${isMagic ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`} />
            <div>
              <p className={`font-bold text-lg leading-tight ${th.text} ${isMagic ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''}`}>MagicTon</p>
              <p className={`text-xs leading-tight ${isMagic ? 'text-cyan-400' : 'text-purple-400'}`}>{isMagic ? '🌊 Underwater Magic Mode' : 'Swap tokens like magic on TON ✨'}</p>
            </div>
          </div>

          <div className={`flex items-center gap-1 ${isLight ? 'bg-gray-100' : isMagic ? 'bg-cyan-950/50 border border-cyan-500/20' : 'bg-gray-800'} rounded-2xl p-1`}>
            <button onClick={() => setActiveTab('swap')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'swap' ? (isMagic ? 'bg-cyan-500 text-white' : 'bg-purple-600 text-white') : `${th.sub} hover:${th.text}`}`}>
              {isMagic ? '🌊 Swap' : '✨ Swap'}
            </button>
            <button onClick={() => setActiveTab('lucky')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'lucky' ? 'bg-yellow-500 text-black' : `${th.sub} hover:${th.text}`}`}>
              🎲 Lucky Swap
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme switcher */}
            <div className={`flex items-center gap-1 ${isLight ? 'bg-gray-100' : isMagic ? 'bg-cyan-950/50 border border-cyan-500/20' : 'bg-gray-800'} rounded-xl p-1`}>
              <button onClick={() => setTheme('dark')} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Dark">🌙</button>
              <button onClick={() => setTheme('light')} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`} title="Light">☀️</button>
              <button onClick={() => setTheme('magic')} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${theme === 'magic' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`} title="Magic Mode">🌊</button>
            </div>
            <TonConnectButton />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mt-8 px-4 mb-8">
        {activeTab === 'lucky' && (
          <div className={`${isMagic ? 'bg-cyan-900/20 border-cyan-400/30' : 'bg-yellow-500/10 border-yellow-500/30'} border rounded-2xl p-4 mb-4 text-center`}>
            <p className={`text-sm font-bold ${isMagic ? 'text-cyan-300' : 'text-yellow-400'}`}>🎲 Lucky Swap — feeling lucky today?</p>
            <p className="text-gray-400 text-xs mt-1">Randomly picks a token pair using 10% of your balance</p>
            <button onClick={handleLuckySwap} className={`mt-2 ${isMagic ? 'bg-cyan-500 hover:bg-cyan-400 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'} font-bold text-sm rounded-xl px-4 py-1.5 transition-all`}>
              🎲 Pick Random Tokens
            </button>
          </div>
        )}

        <div className={`${th.card} border ${th.border} rounded-3xl p-6 shadow-2xl transition-all duration-500 ${isMagic ? 'shadow-cyan-500/20 backdrop-blur-md' : ''}`}>

          {/* Swap header */}
          <div className="flex items-center justify-between mb-4">
            <p className={`font-bold text-lg ${th.text}`}>Swap tokens</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setRefreshTick(t => t + 1)} className={`${th.sub} hover:${th.text} w-8 h-8 flex items-center justify-center rounded-xl hover:${th.btn} transition-all text-lg`} title="Refresh">↻</button>
              <button onClick={() => setShowSlippage(!showSlippage)} className={`${th.sub} hover:${th.text} w-8 h-8 flex items-center justify-center rounded-xl hover:${th.btn} transition-all`} title="Slippage">⚙️</button>
            </div>
          </div>

          {showSlippage && (
            <div className={`${th.inner} rounded-2xl p-4 mb-3`}>
              <p className={`${th.sub} text-xs mb-3 font-bold`}>⚙️ Slippage Tolerance</p>
              <div className="flex gap-2 mb-3">
                {['0.5', '1', '2', '3'].map(val => (
                  <button key={val} onClick={() => setSlippage(val)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${slippage === val ? (isMagic ? 'bg-cyan-500 text-white' : 'bg-purple-600 text-white') : `${th.btn} ${th.sub}`}`}>
                    {val}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className={`${th.sub} text-xs`}>Custom:</span>
                <input type="number" placeholder="%" value={!['0.5','1','2','3'].includes(slippage) ? slippage : ''}
                  onChange={(e) => setSlippage(e.target.value)}
                  className={`${th.btn} ${th.text} text-xs rounded-xl px-3 py-1.5 flex-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
                <span className={`${th.sub} text-xs`}>%</span>
              </div>
              {parseFloat(slippage) > 5 && <p className="text-yellow-400 text-xs mt-2">⚠️ High slippage!</p>}
            </div>
          )}

          {/* From */}
          <div className={`${th.inner} rounded-2xl p-4 mb-2 ${isMagic ? 'border border-cyan-500/10' : ''}`}>
            <p className={`${th.sub} text-sm mb-3`}>You send</p>
            <div className="flex items-center gap-3">
              <TokenSelect value={fromToken} onChange={(t) => { setFromToken(t); setQuote(null); }} tokens={tokens} setTokens={setTokens} setShowBadgeInfo={setShowBadgeInfo} />
              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                className={`bg-transparent ${th.text} text-2xl font-bold w-0 flex-1 outline-none text-right placeholder-gray-600 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className={th.sub}>{amount && bannerPrices[fromToken.symbol]?.price ? `≈ $${(parseFloat(amount) * bannerPrices[fromToken.symbol].price).toFixed(2)}` : ''}</span>
              <span className={th.sub}>Balance: <span className={th.text}>{balances[fromToken.symbol] ?? '—'} {fromToken.symbol}</span></span>
            </div>
            {balances[fromToken.symbol] && parseFloat(balances[fromToken.symbol]) > 0 && (
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount((parseFloat(balances[fromToken.symbol]) * pct / 100).toFixed(4))}
                    className={`flex-1 ${th.btn} hover:${isMagic ? 'bg-cyan-600' : 'bg-purple-600'} ${th.sub} hover:text-white text-xs rounded-lg py-1 transition-all`}>{pct}%</button>
                ))}
              </div>
            )}
          </div>

          {/* Flip */}
          <div className="flex justify-center my-3">
            <button onClick={handleFlip} className={`${isMagic ? 'bg-cyan-800 hover:bg-cyan-600 border-[#020b18] shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'bg-gray-700 hover:bg-purple-600 border-gray-900'} text-white rounded-full w-9 h-9 flex items-center justify-center transition-all hover:rotate-180 duration-300 text-lg border-4`}>⇅</button>
          </div>

          {/* To */}
          <div className={`${th.inner} rounded-2xl p-4 mb-4 ${isMagic ? 'border border-cyan-500/10' : ''}`}>
            <p className={`${th.sub} text-sm mb-3`}>You receive</p>
            <div className="flex items-center gap-3">
              <TokenSelect value={toToken} onChange={(t) => { setToToken(t); setQuote(null); }} tokens={tokens} setTokens={setTokens} setShowBadgeInfo={setShowBadgeInfo} />
              <div className={`flex-1 text-right text-2xl font-bold ${isMagic ? 'text-cyan-300' : 'text-purple-400'}`}>
                {loadingQuote ? <span className="text-gray-500 text-lg">fetching...</span> : quote ?? '0.00'}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className={th.sub}>{quote && bannerPrices[toToken.symbol]?.price ? `≈ $${(parseFloat(quote) * bannerPrices[toToken.symbol].price).toFixed(2)}` : ''}</span>
              <span className={th.sub}>Balance: <span className={th.text}>{balances[toToken.symbol] ?? '—'} {toToken.symbol}</span></span>
            </div>
          </div>

          {quote && amount && (
            <div className={`${isMagic ? 'bg-cyan-900/20 border-cyan-500/20' : 'bg-purple-900/20 border-purple-500/20'} border rounded-xl p-3 mb-4 text-sm flex justify-between`}>
              <span className={th.sub}>Rate</span>
              <span className={isMagic ? 'text-cyan-300' : 'text-purple-300'}>1 {fromToken.symbol} ≈ {(parseFloat(quote) / parseFloat(amount)).toFixed(4)} {toToken.symbol}</span>
            </div>
          )}

          <button onClick={handleMagicSwap} disabled={loading}
            className={`w-full disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition-all duration-300 shadow-lg mb-3 ${
              activeTab === 'lucky' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400' :
              isMagic ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/30' :
              'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/30'
            }`}>
            {loading ? (isMagic ? '🌊 Magic happening...' : '✨ Magic happening...') : activeTab === 'lucky' ? '🎲 Lucky Swap!' : isMagic ? '🌊 Magic Swap' : '✨ Magic Swap'}
          </button>

          <button onClick={() => setShowHistory(!showHistory)}
            className={`w-full ${th.inner} hover:opacity-80 border ${isLight ? 'border-gray-200' : isMagic ? 'border-cyan-500/20' : 'border-gray-600'} ${th.sub} font-bold text-sm rounded-2xl py-2 transition-all`}>
            📊 {showHistory ? 'Hide' : 'Show'} Swap History ({swapHistory.length})
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {swapHistory.length === 0 ? <p className={`text-center ${th.sub} text-sm py-4`}>No swaps yet!</p> :
                swapHistory.map((s, i) => (
                  <div key={i} className={`${th.inner} rounded-xl p-3 text-sm`}>
                    <span className={`${th.text} font-bold`}>{s.fromAmount} {s.from}</span>
                    <span className={`${th.sub} mx-2`}>→</span>
                    <span className={`${isMagic ? 'text-cyan-400' : 'text-purple-400'} font-bold`}>{s.toAmount} {s.to}</span>
                    <p className={`${th.sub} text-xs mt-1`}>{s.time}</p>
                  </div>
                ))}
            </div>
          )}
          <p className={`text-center ${th.sub} text-sm mt-4`}>Powered by STON.fi • Live prices</p>
        </div>
      </div>

      {/* Success Popup */}
      {successData && (
        <div className="fixed inset-0 flex items-end justify-end p-6 z-50 pointer-events-none">
          <div className={`${isMagic ? 'bg-[#041428] border-cyan-500/40' : 'bg-gray-900 border-green-500/40'} border rounded-2xl p-4 shadow-2xl w-80 pointer-events-auto animate-slide-in`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${isMagic ? 'bg-cyan-500' : 'bg-green-500'} rounded-full flex items-center justify-center text-white text-sm font-bold`}>{isMagic ? '🌊' : '✓'}</div>
                <span className={`${isMagic ? 'text-cyan-400' : 'text-green-400'} font-bold text-lg`}>Swap Successful!</span>
              </div>
              <button onClick={() => setSuccessData(null)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Swapped <span className="text-white font-bold">{successData.fromAmount} {successData.fromSymbol}</span> for <span className={`${isMagic ? 'text-cyan-400' : 'text-purple-400'} font-bold`}>{successData.toAmount} {successData.toSymbol}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <img src="/MagicTon_logo.png" alt="MagicTon" className="w-4 h-4 rounded" />
              <span>via MagicTon</span>
            </div>
            <a href={`https://tonscan.org/address/${successData.txHash}`} target="_blank" rel="noopener noreferrer"
              className={`w-full block text-center ${isMagic ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-purple-600 hover:bg-purple-500'} text-white font-bold text-sm rounded-xl py-2 transition-all`}>
              View Transaction →
            </a>
          </div>
        </div>
      )}

      {/* Badge Info Modal */}
      {showBadgeInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-blue-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-white font-bold text-xl">✓ Verified Token</h2>
              <button onClick={() => setShowBadgeInfo(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <p className="text-blue-400 font-bold mb-2 text-sm">✓ What does verified mean?</p>
                <p className="text-gray-400 text-xs">This token has been manually reviewed and added to MagicTon's trusted list. It is a well-known token on the TON blockchain.</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                <p className="text-yellow-400 font-bold mb-2 text-sm">⚠️ Unverified tokens</p>
                <p className="text-gray-400 text-xs">Custom tokens added via contract address are NOT verified. Always double-check before swapping. Beware of scam tokens!</p>
              </div>
              <button onClick={() => setShowBadgeInfo(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-2 transition-all text-sm">Got it!</button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <img src="/MagicTon_logo.png" alt="MagicTon" className="w-10 h-10 rounded-xl" />
                <h2 className="text-white font-bold text-2xl">About MagicTon</h2>
              </div>
              <button onClick={() => setShowAbout(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-4 text-gray-400 text-sm">
              <p>🪄 <span className="text-white font-bold">MagicTon</span> is a decentralized token swap app built on the <span className="text-purple-400">TON blockchain</span>, powered by STON.fi DEX.</p>
              <p>✨ Swap any TON-based token instantly with live prices, real wallet balances, and zero custody of your funds.</p>
              <p>🎲 Our unique <span className="text-yellow-400 font-bold">Lucky Swap</span> feature randomly picks a token pair for adventurous traders!</p>
              <p>🌊 Activate <span className="text-cyan-400 font-bold">Magic Mode</span> for an immersive underwater TON experience!</p>
              <p>🔒 MagicTon is fully <span className="text-green-400 font-bold">non-custodial</span> — we never hold your keys or funds.</p>
              <div className="bg-gray-800 rounded-2xl p-4">
                <p className="text-white font-bold mb-2">Built with:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['• Next.js', '• STON.fi SDK', '• TonConnect', '• Tailwind CSS', '• CoinGecko API', '• Toncenter API'].map(t => <span key={t} className="text-purple-400">{t}</span>)}
                </div>
              </div>
              <a href="https://github.com/harshimg/MagicTon" target="_blank" className="block text-center bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl py-2 transition-all">View on GitHub →</a>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaq && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-white font-bold text-2xl">❓ FAQ</h2>
              <button onClick={() => setShowFaq(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-4">
              {[
                { q: 'What is MagicTon?', a: 'MagicTon is a decentralized token swap app on the TON blockchain, powered by STON.fi DEX.' },
                { q: 'Is MagicTon safe?', a: 'Yes! MagicTon is fully non-custodial. We never hold your private keys or funds.' },
                { q: 'What is Lucky Swap?', a: 'Lucky Swap randomly picks a token pair and swaps 10% of your balance. Fun!' },
                { q: 'What is Magic Mode?', a: 'Magic Mode transforms the interface into an underwater TON-themed experience with animations!' },
                { q: 'What wallets are supported?', a: 'Tonkeeper, TonHub, and any TonConnect-compatible wallet.' },
                { q: 'What are the fees?', a: 'MagicTon charges no fees. Only STON.fi\'s 0.2% swap fee + TON gas.' },
                { q: 'What is slippage?', a: 'Slippage is price difference during swap. Default is 1%.' },
                { q: 'Can I add custom tokens?', a: 'Yes! Paste any TON contract address in the token selector to add it.' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-800 rounded-2xl p-4">
                  <p className="text-white font-bold text-sm mb-2">Q: {item.q}</p>
                  <p className="text-gray-400 text-xs">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`relative z-10 w-full max-w-4xl border-t ${isLight ? 'border-gray-200' : isMagic ? 'border-cyan-500/10' : 'border-gray-800'} pt-8 pb-6 px-4`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/MagicTon_logo.png" alt="MagicTon" className="w-8 h-8 rounded-lg" />
              <span className={`${th.text} font-bold text-lg`}>MagicTon</span>
            </div>
            <p className={`${th.sub} text-xs`}>Swap tokens like magic on TON blockchain. Fast, simple, and secure.</p>
          </div>
          <div>
            <p className={`${th.text} font-bold mb-3 text-sm`}>Tools</p>
            <div className={`space-y-2 ${th.sub} text-xs`}>
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setActiveTab('swap')}>Magic Swap</p>
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setActiveTab('lucky')}>Lucky Swap</p>
            </div>
          </div>
          <div>
            <p className={`${th.text} font-bold mb-3 text-sm`}>MagicTon</p>
            <div className={`space-y-2 ${th.sub} text-xs`}>
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setShowAbout(true)}>About</p>
              <a href="https://github.com/harshimg/MagicTon" target="_blank" className="block hover:text-purple-400">GitHub</a>
            </div>
          </div>
          <div>
            <p className={`${th.text} font-bold mb-3 text-sm`}>Support</p>
            <div className={`space-y-2 ${th.sub} text-xs`}>
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setShowFaq(true)}>FAQ</p>
              <p className="hover:text-purple-400 cursor-pointer">Contact</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4">
            <a href="https://t.me/" target="_blank" className={`${th.sub} hover:text-purple-400 text-xl`}>✈️</a>
            <a href="https://twitter.com/" target="_blank" className={`${th.sub} hover:text-purple-400 text-xl`}>🐦</a>
            <a href="https://github.com/harshimg/MagicTon" target="_blank" className={`${th.sub} hover:text-purple-400 text-xl`}>💻</a>
          </div>
          <p className={`${th.sub} text-xs`}>MagicTon © 2026 • Powered by <a href="https://ston.fi" target="_blank" className="hover:text-purple-400">STON.fi</a> • Built on <a href="https://ton.org" target="_blank" className="hover:text-blue-400">TON</a></p>
          <p className={`${th.sub} text-xs`}>Data by <a href="https://coingecko.com" target="_blank" className="hover:text-green-400">CoinGecko</a></p>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        @keyframes slide-in { 0% { transform: translateX(100px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes bubble { 0% { transform: translateY(0) scale(1); opacity: 0.6; } 100% { transform: translateY(-100vh) scale(1.2); opacity: 0; } }
        .animate-bubble { animation: bubble linear infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); opacity: 0.4; } 50% { transform: translateY(-15px); opacity: 0.8; } }
        .animate-float { animation: float ease-in-out infinite; }
        @keyframes sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .animate-sway { animation: sway 3s ease-in-out infinite; }
        @keyframes spin-slow { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.5); } 100% { transform: rotate(360deg) scale(1); } }
        .animate-spin-slow { animation: spin-slow 2s ease-in-out; }
        @keyframes explode { 0% { transform: scale(0) translate(0,0); opacity: 1; } 100% { transform: scale(1.5) translate(var(--tx, 50px), var(--ty, -50px)); opacity: 0; } }
        .animate-explode { animation: explode 1.5s ease-out forwards; --tx: ${Math.random() > 0.5 ? '' : '-'}${30 + Math.floor(Math.random() * 60)}px; --ty: -${20 + Math.floor(Math.random() * 80)}px; }
      `}</style>
    </main>
  );
}