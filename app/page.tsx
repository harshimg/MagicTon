'use client';

import { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { StonApiClient } from '@ston-fi/api';
import { DEX, pTON } from '@ston-fi/sdk';
import { TonClient, toNano } from '@ton/ton';


const tonClient = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
});

type Token = { symbol: string; name: string; icon: string; address: string; decimals: number; verified: boolean; };

const DEFAULT_tokens: Token[] = [
  { symbol: 'TON', name: 'Toncoin', icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png', address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', decimals: 9, verified: true },
  { symbol: 'USDt', name: 'Tether USD', icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6, verified: true },
  { symbol: 'STON', name: 'STON.fi', icon: 'https://assets.coingecko.com/coins/images/31233/standard/STON.jpg?1696530059', address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', decimals: 9, verified: true },
  { symbol: 'NOT', name: 'Notcoin', icon: 'https://assets.coingecko.com/coins/images/33453/standard/rFmThDiD_400x400.jpg?1701876350', address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', decimals: 9, verified: true },
  { symbol: 'GOMINING', name: 'GoMining Token', icon: 'https://assets.coingecko.com/coins/images/15662/standard/GoMining_Logo.webp?1769225542', address: 'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8', decimals: 9, verified: true },
];

const BANNER_tokens = [
  { symbol: 'TON', coingecko: 'the-open-network', icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png' },
  { symbol: 'STON', coingecko: 'ston-2', icon: 'https://assets.coingecko.com/coins/images/31233/standard/STON.jpg?1696530059' },
  { symbol: 'NOT', coingecko: 'notcoin', icon: 'https://assets.coingecko.com/coins/images/33453/standard/rFmThDiD_400x400.jpg?1701876350' },
  { symbol: 'GOMINING', coingecko: 'gmt-token', icon: 'https://assets.coingecko.com/coins/images/15662/standard/GoMining_Logo.webp?1769225542' },
  { symbol: 'BTC', coingecko: 'bitcoin', icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { symbol: 'ETH', coingecko: 'ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
];

type SwapRecord = { from: string; to: string; fromAmount: string; toAmount: string; time: string; };
{/* state */}
export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'lucky'>('swap');
  const [tokens, settokens] = useState<Token[]>(DEFAULT_tokens);
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [bannerPrices, setBannerPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [slippage, setSlippage] = useState('1');
  const [showSlippage, setShowSlippage] = useState(false);
  const [successData, setSuccessData] = useState<{ fromAmount: string; fromSymbol: string; toAmount: string; toSymbol: string; txHash?: string } | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [theme, setTheme] = useState<'dark' | 'light' | 'magic'>('dark');
  const [particles] = useState(
  [...Array(30)].map(() => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: 2 + Math.random() * 3,
  }))
);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = 'the-open-network,ston-2,notcoin,gmt-token,bitcoin,ethereum';
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
  }, [wallet]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); setPrediction(null); return; }
    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const units = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
        const res = await fetch('/api/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerAddress: fromToken.address, askAddress: toToken.address, amount, decimals: fromToken.decimals, slippage }),
        });
        const result = await res.json();
        const outAmount = parseInt(result.askUnits) / Math.pow(10, toToken.decimals);
        setQuote(outAmount.toFixed(6));
        const fromChange = bannerPrices[fromToken.symbol]?.change ?? 0;
        const toChange = bannerPrices[toToken.symbol]?.change ?? 0;
        if (fromChange > 2 && toChange < fromChange) setPrediction('⚠️ Your sell token is pumping! Maybe wait?');
        else if (toChange > 2) setPrediction('🚀 Great time! Receive token is trending up!');
        else if (fromChange < -2) setPrediction('✅ Good call! Sell token is dropping.');
        else setPrediction('😐 Market is stable. Safe to swap!');
      } catch { setQuote(null); setPrediction(null); }
      setLoadingQuote(false);
    };
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken, bannerPrices, refreshTick]);

  useEffect(() => {
    const saved = localStorage.getItem('magicton_history');
    if (saved) setSwapHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
  if (theme !== 'magic') return;

  const move = (e: MouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY });
  };

  window.addEventListener('mousemove', move);
  return () => window.removeEventListener('mousemove', move);
}, [theme]);

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
      setSuccessData({ fromAmount: amount, fromSymbol: fromToken.symbol, toAmount: quote ?? '?', toSymbol: toToken.symbol, txHash: wallet?.account?.address });
      if (theme === 'magic') {
  triggerMagicEffect();
  new Audio('/magic.mp3').play(); // optional sound
}
    } catch (e: any) { alert('Swap failed: ' + (e?.message || 'Unknown error')); }
    setLoading(false);
  };

  const handleLuckySwap = () => {
    const available = tokens.filter(t => parseFloat(balances[t.symbol] ?? '0') > 0);
    if (available.length === 0) { alert('No token balance found for Lucky Swap!'); return; }
    const from = available[Math.floor(Math.random() * available.length)];
    const others = tokens.filter(t => t.symbol !== from.symbol);
    const to = others[Math.floor(Math.random() * others.length)];
    const bal = parseFloat(balances[from.symbol] ?? '0');
    setFromToken(from); setToToken(to); setAmount((bal * 0.1).toFixed(4));
  };

  const handleFlip = () => { setFromToken(toToken); setToToken(fromToken); setQuote(null); setAmount(''); };
  const triggerMagicEffect = () => {
  const el = document.createElement('div');
  el.className = 'magic-burst';
  document.body.appendChild(el);

  setTimeout(() => {
    document.body.removeChild(el);
  }, 1500);
};
  const TokenSelect = ({ value, onChange }: { value: Token; onChange: (t: Token) => void }) => {
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
          symbol: data.symbol,
          name: data.name,
          icon: data.image || 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
          address: contractInput.trim(),
          decimals: data.decimals ?? 9,
          verified: false,
        };
        settokens(prev => prev.find(t => t.address === newToken.address) ? prev : [...prev, newToken]);
        onChange(newToken);
        setOpen(false);
        setContractInput('');
      } catch {
        setFetchError('Failed to fetch token info');
      }
      setFetchingToken(false);
    };

    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} 
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 font-bold outline-none cursor-pointer transition-all ${
  theme === 'magic'
    ? 'bg-gray-700 hover:bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
    : 'bg-gray-700 hover:bg-gray-600'
}`}
>
          <img src={value.icon} alt={value.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span>{value.symbol}</span>
          {value.verified && (
            <span onClick={(e) => { e.stopPropagation(); setShowBadgeInfo(true); }}
              className="text-blue-400 text-xs cursor-pointer hover:text-blue-300" title="Verified token">✓</span>
          )}
          <span className="text-gray-400 text-sm">▼</span>
        </button>
        {open && (
          <div className="absolute top-12 left-0 bg-gray-800 border border-gray-600 rounded-2xl overflow-hidden z-50 w-64 shadow-xl">
            {/* Token list */}
            {tokens.map(t => (
              <button key={t.address} onClick={() => { onChange(t); setOpen(false); }} className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-700 text-white font-bold">
                <img src={t.icon} alt={t.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span>{t.symbol}</span>
                {t.verified && <span className="text-blue-400 text-xs">✓</span>}
                {!t.verified && <span className="text-yellow-400 text-xs">⚠️</span>}
              </button>
            ))}
            {/* Custom token input */}
            <div className="border-t border-gray-700 p-3">
              <p className="text-gray-400 text-xs mb-2 font-bold">+ Add Custom Token</p>
              <input
                type="text"
                placeholder="Paste contract address..."
                value={contractInput}
                onChange={(e) => setContractInput(e.target.value)}
                className="w-full bg-gray-700 text-white text-xs rounded-xl px-3 py-2 outline-none placeholder-gray-500 mb-2"
              />
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

  const SwapCard = ({ isLucky }: { isLucky: boolean }) => (
    <>
      {isLucky && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-4 text-center">
          <p className="text-yellow-400 text-sm font-bold">🎲 Lucky Swap - feeling lucky today?</p>
          <p className="text-gray-400 text-xs mt-1">Randomly picks a token pair using 10% of your balance</p>
          <button onClick={handleLuckySwap} className="mt-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl px-4 py-1.5 transition-all">
            🎲 Pick Random tokens
          </button>
        </div>
      )}
      <div
  className={`rounded-3xl p-6 shadow-2xl transition-all ${
    theme === 'magic'
      ? 'bg-black/40 border border-purple-500 shadow-purple-500/40 backdrop-blur-xl'
      : 'bg-gray-900 border border-purple-500/30 shadow-purple-500/10'
  }`}
>

      {/* From */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-2">
        <p className="text-gray-400 text-sm mb-3">You send</p>
        <div className="flex items-center gap-3">
          <TokenSelect value={fromToken} onChange={(t) => { setFromToken(t); setQuote(null); }} />
          <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-white text-2xl font-bold w-0 flex-1 outline-none text-right placeholder-gray-600 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className="text-gray-400">{amount && bannerPrices[fromToken.symbol]?.price ? `≈ $${(parseFloat(amount) * bannerPrices[fromToken.symbol].price).toFixed(2)}` : ''}</span>
          <span>Balance: <span className="text-gray-300">{balances[fromToken.symbol] ?? '—'} {fromToken.symbol}</span></span>
        </div>
        {balances[fromToken.symbol] && parseFloat(balances[fromToken.symbol]) > 0 && (
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setAmount((parseFloat(balances[fromToken.symbol]) * pct / 100).toFixed(4))}
                className="flex-1 bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white text-xs rounded-lg py-1 transition-all">{pct}%</button>
            ))}
          </div>
        )}
      </div>

      {/* Swap header with title + controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-white font-bold text-lg">Swap tokens</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setRefreshTick(t => t + 1)}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-700 transition-all text-lg"
            title="Refresh price">↻</button>
          <button onClick={() => setShowSlippage(!showSlippage)}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-700 transition-all text-sm font-bold"
            title="Slippage settings">⚙️</button>
        </div>
      </div>

      {/* Slippage Settings */}
      {showSlippage && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-3">
          <p className="text-gray-400 text-xs mb-3 font-bold">⚙️ Slippage Tolerance</p>
          <div className="flex gap-2 mb-3">
            {['0.5', '1', '2', '3'].map(val => (
              <button key={val} onClick={() => setSlippage(val)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${slippage === val ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {val}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">Custom:</span>
            <input type="number" placeholder="Custom %" value={!['0.5','1','2','3'].includes(slippage) ? slippage : ''}
              onChange={(e) => setSlippage(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded-xl px-3 py-1.5 flex-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <span className="text-gray-500 text-xs">%</span>
          </div>
          {parseFloat(slippage) > 5 && (
            <p className="text-yellow-400 text-xs mt-2">⚠️ High slippage! You may get a bad price.</p>
          )}
        </div>
      )}

      {/* Flip - only in middle */}
      <div className="flex justify-center my-2">
        <button onClick={handleFlip} className="bg-gray-700 hover:bg-purple-600 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all hover:rotate-180 duration-300 text-lg border-4 border-gray-900">⇅</button>
      </div>


      {/* To */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <p className="text-gray-400 text-sm mb-3">You receive</p>
        <div className="flex items-center gap-3">
          <TokenSelect value={toToken} onChange={(t) => { setToToken(t); setQuote(null); }} />
          <div className="flex-1 text-right text-2xl font-bold text-purple-400">
            {loadingQuote ? <span className="text-gray-500 text-lg">fetching...</span> : quote ?? '0.00'}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className="text-gray-400">{quote && bannerPrices[toToken.symbol]?.price ? `≈ $${(parseFloat(quote) * bannerPrices[toToken.symbol].price).toFixed(2)}` : ''}</span>
          <span>Balance: <span className="text-gray-300">{balances[toToken.symbol] ?? '—'} {toToken.symbol}</span></span>
        </div>
      </div>



      {quote && amount && (
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 mb-4 text-sm text-gray-400 flex justify-between">
          <span>Rate</span>
          <span className="text-purple-300">1 {fromToken.symbol} ≈ {(parseFloat(quote) / parseFloat(amount)).toFixed(4)} {toToken.symbol}</span>
        </div>
      )}

      <button
  onClick={handleMagicSwap}
  disabled={loading}
  className={`w-full disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition-all duration-300 shadow-lg mb-3 hover:scale-105 active:scale-95 ${
    theme === 'magic'
      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.8)]'
      : isLucky
      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 shadow-yellow-500/30'
      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/30'
  }`}
>
  {loading
    ? '✨ Magic happening...'
    : isLucky
    ? '🎲 Lucky Swap!'
    : '✨ Magic Swap'}
</button>

      <button onClick={() => setShowHistory(!showHistory)}
        className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 font-bold text-sm rounded-2xl py-2 transition-all duration-300">
        📊 {showHistory ? 'Hide' : 'Show'} Swap History ({swapHistory.length})
      </button>

      {showHistory && (
        <div className="mt-4 space-y-2">
          {swapHistory.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">No swaps yet!</p>
          ) : (
            swapHistory.map((s, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-3 text-sm">
                <span className="text-white font-bold">{s.fromAmount} {s.from}</span>
                <span className="text-gray-400 mx-2">→</span>
                <span className="text-purple-400 font-bold">{s.toAmount} {s.to}</span>
                <p className="text-gray-500 text-xs mt-1">{s.time}</p>
              </div>
            ))
          )}
        </div>
      )}
      <p className="text-center text-gray-500 text-sm mt-4">Powered by STON.fi • Live prices</p>
    </div>
    </>
  );

  return (
    <main
  className={`min-h-screen flex flex-col items-center transition-all duration-500 ${
    theme === 'dark'
      ? 'bg-black text-white'
      : theme === 'light'
      ? 'bg-white text-black'
      : 'bg-gradient-to-br from-purple-900 via-black to-blue-900 text-white'
      
  }`}
>

  {theme === 'magic' && (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    {particles.map((p, i) => (
  <div
    key={i}
    className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
    style={{
      top: p.top + '%',
      left: p.left + '%',
      animationDuration: p.duration + 's',
    }}
  />
))}
  </div>
)}


{theme === 'magic' && (
  <div
    className="fixed w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none z-0 transition-all duration-75"
    style={{
      top: cursor.y - 80,
      left: cursor.x - 80,
    }}
  />
)}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />

      {/* Navbar */}
      <div className="w-full bg-gray-900/90 border-b border-gray-800 relative z-20">
        {/* Price Banner */}
        <div className="w-full bg-black/50 overflow-hidden py-1.5 border-b border-gray-800">
          <div className="flex animate-marquee gap-8 whitespace-nowrap">
            {[...BANNER_tokens, ...BANNER_tokens].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <img src={t.icon} alt={t.symbol} className="w-4 h-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-white font-bold">{t.symbol}</span>
                <span className="text-gray-300">${bannerPrices[t.symbol]?.price ? bannerPrices[t.symbol].price < 0.01 ? bannerPrices[t.symbol].price.toFixed(6) : bannerPrices[t.symbol].price.toFixed(2) : '...'}</span>
                <span className={bannerPrices[t.symbol]?.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {bannerPrices[t.symbol]?.change >= 0 ? '+' : ''}{bannerPrices[t.symbol]?.change?.toFixed(2) ?? '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo left */}
          <div className="flex items-center gap-3">
            <img src="/MagicTon_logo.png" alt="MagicTon" className="w-9 h-9 rounded-xl" />
            <div>
              <p className="text-white font-bold text-lg leading-tight">MagicTon</p>
              <p className="text-purple-400 text-xs leading-tight">Swap tokens like magic on TON ✨</p>
            </div>
          </div>

          {/* Nav tabs center */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-2xl p-1">
            <button onClick={() => setActiveTab('swap')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'swap' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              ✨ Swap
            </button>
            <button onClick={() => setActiveTab('lucky')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'lucky' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              🎲 Lucky Swap
            </button>
          </div>
          
          <div className="flex gap-2 mr-4">
  {['dark', 'light', 'magic'].map((t) => (
    <button
      key={t}
      onClick={() => setTheme(t as any)}
      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
        theme === t
          ? 'bg-purple-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {t === 'magic' ? '✨ Magic' : t}
    </button>
  ))}
</div>

          {/* Wallet right */}
          <TonConnectButton />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mt-8 px-4">
        <SwapCard isLucky={activeTab === 'lucky'} />
      </div>

      {/* Success Popup */}
      {successData && (
        <div className="fixed inset-0 flex items-end justify-end p-6 z-50 pointer-events-none">
          <div className="bg-gray-900 border border-green-500/40 rounded-2xl p-4 shadow-2xl w-80 pointer-events-auto animate-slide-in">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
                <span className="text-green-400 font-bold text-lg">Swap Successful!</span>
              </div>
              <button onClick={() => setSuccessData(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Swapped <span className="text-white font-bold">{successData.fromAmount} {successData.fromSymbol}</span> for <span className="text-purple-400 font-bold">{successData.toAmount} {successData.toSymbol}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <img src="/MagicTon_logo.png" alt="MagicTon" className="w-4 h-4 rounded" />
              <span>via MagicTon</span>
            </div>
            <a href={`https://tonscan.org/address/${successData.txHash}`} target="_blank" rel="noopener noreferrer"
              className="w-full block text-center bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl py-2 transition-all">
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
      <div className="space-y-3 text-sm">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <p className="text-blue-400 font-bold mb-2">✓ What does verified mean?</p>
          <p className="text-gray-400 text-xs">This token has been manually reviewed and added to MagicTon's trusted token list. It is a well-known token on the TON blockchain.</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <p className="text-yellow-400 font-bold mb-2">⚠️ Unverified tokens</p>
          <p className="text-gray-400 text-xs">Custom tokens added via contract address are NOT verified. Always double-check the contract address before swapping. Beware of scam tokens!</p>
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
        <p>🔒 MagicTon is fully <span className="text-green-400 font-bold">non-custodial</span> — we never hold your keys or funds. All transactions are signed directly in your wallet.</p>
        <div className="bg-gray-800 rounded-2xl p-4 mt-4">
          <p className="text-white font-bold mb-2">Built with:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-purple-400">• Next.js</span>
            <span className="text-purple-400">• STON.fi SDK</span>
            <span className="text-purple-400">• TonConnect</span>
            <span className="text-purple-400">• Tailwind CSS</span>
            <span className="text-purple-400">• CoinGecko API</span>
            <span className="text-purple-400">• Toncenter API</span>
          </div>
        </div>
        <a href="https://github.com/harshimg/MagicTon" target="_blank" className="block text-center bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl py-2 mt-4 transition-all">View on GitHub →</a>
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
          { q: 'Is MagicTon safe?', a: 'Yes! MagicTon is fully non-custodial. We never hold your private keys or funds. All swaps are signed directly in your Tonkeeper wallet.' },
          { q: 'What is Lucky Swap?', a: 'Lucky Swap randomly picks a token pair from your wallet balance and swaps 10% of it. It\'s a fun way to discover new tokens!' },
          { q: 'What wallets are supported?', a: 'MagicTon supports Tonkeeper, TonHub, and any TonConnect-compatible wallet.' },
          { q: 'What are the fees?', a: 'MagicTon charges no fees. You only pay STON.fi\'s standard 0.2% swap fee plus TON network gas fees.' },
          { q: 'Why does my balance show —?', a: 'Connect your wallet first by clicking the Connect Wallet button. Balances load automatically after connection.' },
          { q: 'What is slippage?', a: 'Slippage is the difference between expected and actual swap price due to market movement. MagicTon uses 1% slippage tolerance by default.' },
          { q: 'Can I add custom tokens?', a: 'Currently MagicTon supports a curated list of trusted TON tokens. More tokens will be added soon!' },
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
      <div className="relative z-10 w-full max-w-4xl mt-12 border-t border-gray-800 pt-8 pb-6 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/MagicTon_logo.png" alt="MagicTon" className="w-8 h-8 rounded-lg" />
              <span className="text-white font-bold text-lg">MagicTon</span>
            </div>
            <p className="text-gray-500 text-xs">Swap tokens like magic on TON blockchain. Fast, simple, and secure.</p>
          </div>
          <div>
            <p className="text-white font-bold mb-3 text-sm">Tools</p>
            <div className="space-y-2 text-gray-500 text-xs">
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setActiveTab('swap')}>Magic Swap</p>
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setActiveTab('lucky')}>Lucky Swap</p>

            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-3 text-sm">MagicTon</p>
            <div className="space-y-2 text-gray-500 text-xs">
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setShowAbout(true)}>About</p>
              <a href="https://github.com/harshimg/MagicTon" target="_blank" className="block hover:text-purple-400">GitHub</a>
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-3 text-sm">Support</p>
            <div className="space-y-2 text-gray-500 text-xs">
              <p className="hover:text-purple-400 cursor-pointer" onClick={() => setShowFaq(true)}>FAQ</p>
              <p className="hover:text-purple-400 cursor-pointer">Contact</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4">
            <a href="https://t.me/" target="_blank" className="text-gray-500 hover:text-purple-400 text-xl">✈️</a>
            <a href="https://twitter.com/" target="_blank" className="text-gray-500 hover:text-purple-400 text-xl">🐦</a>
            <a href="https://github.com/harshimg/MagicTon" target="_blank" className="text-gray-500 hover:text-purple-400 text-xl">💻</a>
          </div>
          <p className="text-gray-600 text-xs">
            MagicTon © 2026 • Powered by{' '}
            <a href="https://ston.fi" target="_blank" className="hover:text-purple-400 transition-colors">STON.fi</a>
              {' '}• Built on{' '}
            <a href="https://ton.org" target="_blank" className="hover:text-blue-400 transition-colors">TON</a>
          </p>
          <p className="text-gray-600 text-xs">
            Data by{' '}
            <a href="https://coingecko.com" target="_blank" className="hover:text-green-400 transition-colors">CoinGecko</a>
          </p>
          </div>
        </div>

      <style jsx>{`
        .magic-burst {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%);
  animation: burst 1.5s ease-out;
  z-index: 999;
}

@keyframes burst {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(2); }
}
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        @keyframes slide-in { 0% { transform: translateX(100px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </main>
  );
}