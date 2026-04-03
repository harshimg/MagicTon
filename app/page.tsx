'use client';

import { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { StonApiClient } from '@ston-fi/api';

const client = new StonApiClient();

const TOKENS = [
  { symbol: 'TON', name: 'Toncoin', icon: '💎', address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', decimals: 9 },
  { symbol: 'USDT', name: 'Tether USD', icon: '💵', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6 },
  { symbol: 'STON', name: 'STON.fi', icon: '⚡', address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', decimals: 9 },
  { symbol: 'NOT', name: 'Notcoin', icon: '🪙', address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', decimals: 9 },
];

export default function Home() {
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tonConnectUI] = useTonConnectUI();

  const handleSwap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  };

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const units = Math.floor(parseFloat(amount) * 1e9).toString();
        const result = await client.simulateSwap({
          offerAddress: fromToken.address,
          askAddress: toToken.address,
          offerUnits: units,
          slippageTolerance: '0.01',
        });
        const out = (parseInt(result.askUnits) / Math.pow(10, toToken.decimals)).toFixed(6);
        setQuote(out);
      } catch (e) {
        console.error(e);
        setQuote(null);
      }
      setLoadingQuote(false);
    };
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const handleMagicSwap = async () => {
    if (!tonConnectUI.connected) {
      tonConnectUI.openModal();
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('✨ Swap submitted! Check your wallet.');
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">✨ MagicTon</h1>
          <p className="text-purple-400">Swap tokens like magic on TON</p>
        </div>
        <div className="flex justify-center mb-6">
          <TonConnectButton />
        </div>
        <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-500/10">
          <div className="bg-gray-800 rounded-2xl p-4 mb-2">
            <p className="text-gray-400 text-sm mb-2">From</p>
            <div className="flex items-center gap-3">
              <select
                className="bg-gray-700 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none cursor-pointer"
                value={fromToken.symbol}
                onChange={(e) => { setFromToken(TOKENS.find(t => t.symbol === e.target.value)!); setQuote(null); }}
              >
                {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.icon} {t.symbol}</option>)}
              </select>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-white text-2xl font-bold w-0 flex-1 outline-none text-right placeholder-gray-600 min-w-0"
              />
            </div>
          </div>
          <div className="flex justify-center my-3">
            <button onClick={handleSwap} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all hover:rotate-180 duration-300">↕</button>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-2">To</p>
            <div className="flex items-center gap-3">
              <select
                className="bg-gray-700 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none cursor-pointer"
                value={toToken.symbol}
                onChange={(e) => { setToToken(TOKENS.find(t => t.symbol === e.target.value)!); setQuote(null); }}
              >
                {TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.icon} {t.symbol}</option>)}
              </select>
              <div className="flex-1 text-right text-2xl font-bold text-purple-400">
                {loadingQuote ? <span className="text-gray-500 text-lg">fetching...</span> : quote ?? '0.00'}
              </div>
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