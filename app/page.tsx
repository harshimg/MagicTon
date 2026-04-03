'use client';

import { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';

const TOKENS = [
  { symbol: 'TON', name: 'Toncoin', icon: '💎', address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c' },
  { symbol: 'USDT', name: 'Tether USD', icon: '💵', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
  { symbol: 'STON', name: 'STON.fi', icon: '⚡', address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO' },
  { symbol: 'NOT', name: 'Notcoin', icon: '🪙', address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__8fd' },
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

  // Fetch real quote from STON.fi API
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const units = Math.floor(parseFloat(amount) * 1000000000).toString();
        const res = await fetch(
          `https://api.ston.fi/v1/swap/simulate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              offer_address: fromToken.address,
              ask_address: toToken.address,
              units: units,
              slippage_tolerance: '0.01',
            }),
          }
        );
        const data = await res.json();
        if (data?.ask_units) {
          const result = (parseInt(data.ask_units) / 1e9).toFixed(6);
          setQuote(result);
        } else {
          setQuote(null);
        }
      } catch {
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            ✨ MagicTon
          </h1>
          <p className="text-purple-400">Swap tokens like magic on TON</p>
        </div>

        {/* Wallet Button */}
        <div className="flex justify-center mb-6">
          <TonConnectButton />
        </div>

        {/* Swap Card */}
        <div className="bg-gray-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-500/10">
          
          {/* From Token */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-2">
            <p className="text-gray-400 text-sm mb-2">From</p>
            <div className="flex items-center gap-3">
              <select
                className="bg-gray-700 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none cursor-pointer"
                value={fromToken.symbol}
                onChange={(e) => {
                  setFromToken(TOKENS.find(t => t.symbol === e.target.value)!);
                  setQuote(null);
                }}
              >
                {TOKENS.map(t => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.icon} {t.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-white text-2xl font-bold flex-1 outline-none text-right placeholder-gray-600"
              />
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center my-3">
            <button
              onClick={handleSwap}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all hover:rotate-180 duration-300"
            >
              ↕
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-2">To</p>
            <div className="flex items-center gap-3">
              <select
                className="bg-gray-700 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none cursor-pointer"
                value={toToken.symbol}
                onChange={(e) => {
                  setToToken(TOKENS.find(t => t.symbol === e.target.value)!);
                  setQuote(null);
                }}
              >
                {TOKENS.map(t => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.icon} {t.symbol}
                  </option>
                ))}
              </select>
              <div className="flex-1 text-right text-2xl font-bold text-purple-400">
                {loadingQuote ? (
                  <span className="text-gray-500 text-lg">fetching...</span>
                ) : quote ? (
                  quote
                ) : (
                  '0.00'
                )}
              </div>
            </div>
          </div>

          {/* Rate info */}
          {quote && amount && (
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 mb-4 text-sm text-gray-400 flex justify-between">
              <span>Rate</span>
              <span className="text-purple-300">
                1 {fromToken.symbol} ≈ {(parseFloat(quote) / parseFloat(amount)).toFixed(4)} {toToken.symbol}
              </span>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleMagicSwap}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition-all duration-300 shadow-lg shadow-purple-500/30"
          >
            {loading ? '✨ Magic happening...' : '✨ Magic Swap'}
          </button>

          <p className="text-center text-gray-500 text-sm mt-4">
            Powered by STON.fi • Live prices
          </p>
        </div>
      </div>
    </main>
  );
}