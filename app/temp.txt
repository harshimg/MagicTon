'use client';

import { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { StonApiClient } from '@ston-fi/api';
import { DEX, pTON } from '@ston-fi/sdk';
import { TonClient, toNano } from '@ton/ton';

const stonApiClient = new StonApiClient();
const tonClient = new TonClient({ 
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: '8c598d1b958dc1bd1f64714540f7b8f7485081fd06338eab2c4acef1ee498f5f'
});

const TOKENS = [
  { 
    symbol: 'TON', 
    name: 'Toncoin', 
    icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png', 
    address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', 
    decimals: 9 
  },
  { 
    symbol: 'USDt', 
    name: 'Tether USD', 
    icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', 
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', 
    decimals: 6 
  },
  { 
    symbol: 'STON',
    name: 'STON.fi',
    icon: 'https://assets.coingecko.com/coins/images/31233/standard/STON.jpg?1696530059',
    address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
    decimals: 9 
  },
  { 
    symbol: 'NOT', 
    name: 'Notcoin', 
    icon: 'https://assets.coingecko.com/coins/images/33453/standard/rFmThDiD_400x400.jpg?1701876350', 
    address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', 
    decimals: 9 
  },
  { 
    symbol: 'GOMINING', 
    name: 'GoMining Token', 
    icon: 'https://assets.coingecko.com/coins/images/15662/standard/GoMining_Logo.webp?1769225542', 
    address: 'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8', 
    decimals: 9 
  },
];

export default function Home() {
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  useEffect(() => {
    if (!wallet?.account?.address) { setBalances({}); return; }
    const fetchBalances = async () => {
      try {
        const { Address } = await import('@ton/ton');
        const userAddr = Address.parse(wallet.account.address);
        const newBalances: Record<string, string> = {};
        const tonBal = await tonClient.getBalance(userAddr);
        newBalances['TON'] = (Number(tonBal) / 1e9).toFixed(2);
        for (const token of TOKENS.filter(t => t.symbol !== 'TON')) {
          try {
            const res = await fetch(`https://toncenter.com/api/v3/jetton/wallets?owner_address=${userAddr.toString()}&jetton_address=${token.address}&limit=1&api_key=8c598d1b958dc1bd1f64714540f7b8f7485081fd06338eab2c4acef1ee498f5f`);
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
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const units = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();
        const result = await stonApiClient.simulateSwap({
          offerAddress: fromToken.address,
          askAddress: toToken.address,
          offerUnits: units,
          slippageTolerance: '0.01',
        });
        setQuote((parseInt(result.askUnits) / Math.pow(10, toToken.decimals)).toFixed(6));
      } catch { setQuote(null); }
      setLoadingQuote(false);
    };
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

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
        txParams = await router.getSwapTonToJettonTxParams({
          userWalletAddress: userAddress, proxyTon: new pTON.v1(),
          offerAmount, askJettonAddress: toToken.address, minAskAmount: '1', queryId: Date.now(),
        });
      } else if (toToken.symbol === 'TON') {
        txParams = await router.getSwapJettonToTonTxParams({
          userWalletAddress: userAddress, offerJettonAddress: fromToken.address,
          offerAmount, proxyTon: new pTON.v1(), minAskAmount: '1', queryId: Date.now(),
        });
      } else {
        txParams = await router.getSwapJettonToJettonTxParams({
          userWalletAddress: userAddress, offerJettonAddress: fromToken.address,
          offerAmount, askJettonAddress: toToken.address, minAskAmount: '1', queryId: Date.now(),
        });
      }
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
          address: txParams.to.toString(),
          amount: txParams.value.toString(),
          payload: txParams.body?.toBoc().toString('base64'),
        }],
      });
      alert('✨ Swap sent! Check your wallet.');
    } catch (e: any) {
      alert('Swap failed: ' + (e?.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const handleFlip = () => { setFromToken(toToken); setToToken(fromToken); setQuote(null); setAmount(''); };

  const TokenSelect = ({ value, onChange }: { value: typeof TOKENS[0], onChange: (t: typeof TOKENS[0]) => void }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl px-3 py-2 font-bold outline-none cursor-pointer"
        >
          <img src={value.icon} alt={value.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span>{value.symbol}</span>
          <span className="text-gray-400 text-sm">▼</span>
        </button>
        {open && (
          <div className="absolute top-12 left-0 bg-gray-800 border border-gray-600 rounded-2xl overflow-hidden z-50 min-w-[150px] shadow-xl">
            {TOKENS.map(t => (
              <button
                key={t.symbol}
                onClick={() => { onChange(t); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 hover:bg-gray-700 text-white font-bold"
              >
                <img src={t.icon} alt={t.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span>{t.symbol}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="relative z-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2">✨ MagicTon</h1>
          <p className="text-purple-400">Swap tokens like magic on TON</p>
        </div>

        {/* Wallet - top right style */}
        <div className="flex justify-end mb-4">
          <TonConnectButton />
        </div>

        {/* Swap Card */}
        <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-500/10">

          {/* From */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-2">
            <p className="text-gray-400 text-sm mb-3">You send</p>
            <div className="flex items-center gap-3">
              <TokenSelect value={fromToken} onChange={(t) => { setFromToken(t); setQuote(null); }} />
              <input
                type="number" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-white text-2xl font-bold w-0 flex-1 outline-none text-right placeholder-gray-600 min-w-0"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span></span>
              <span>Balance: <span className="text-gray-300">{balances[fromToken.symbol] ?? '—'} {fromToken.symbol}</span></span>
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center my-2">
            <button onClick={handleFlip} className="bg-gray-700 hover:bg-purple-600 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all hover:rotate-180 duration-300 text-lg">⇅</button>
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
              <span></span>
              <span>Balance: <span className="text-gray-300">{balances[toToken.symbol] ?? '—'} {toToken.symbol}</span></span>
            </div>
          </div>

          {/* Rate */}
          {quote && amount && (
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 mb-4 text-sm text-gray-400 flex justify-between">
              <span>Rate</span>
              <span className="text-purple-300">1 {fromToken.symbol} ≈ {(parseFloat(quote) / parseFloat(amount)).toFixed(4)} {toToken.symbol}</span>
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleMagicSwap} disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition-all duration-300 shadow-lg shadow-purple-500/30"
          >
            {loading ? '✨ Magic happening...' : '✨ Magic Swap'}
          </button>
          <p className="text-center text-gray-500 text-sm mt-4">Powered by STON.fi • Live prices</p>
        </div>
      </div>
    </main>
  );
}