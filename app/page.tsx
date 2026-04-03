'use client';

import { useState, useEffect } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { StonApiClient } from '@ston-fi/api';
import { DEX, pTON } from '@ston-fi/sdk';
import { TonClient, toNano } from '@ton/ton';

const stonApiClient = new StonApiClient();
const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

const TOKENS = [
  { symbol: 'TON', name: 'Toncoin', icon: '💎', address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', decimals: 9 },
  { symbol: 'USDT', name: 'Tether USD', icon: '💵', address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6 },
  { symbol: 'STON', name: 'STON.fi', icon: '⚡', address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', decimals: 9 },
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

// Fetch all token balances
  useEffect(() => {
    if (!wallet?.account?.address) { setBalances({}); return; }
    const fetchBalances = async () => {
      try {
        const { Address, JettonMaster } = await import('@ton/ton');
        const userAddr = Address.parse(wallet.account.address);
        const newBalances: Record<string, string> = {};

        // TON balance
        const tonBal = await tonClient.getBalance(userAddr);
        newBalances['TON'] = (Number(tonBal) / 1e9).toFixed(2);

        // Jetton balances
        for (const token of TOKENS.filter(t => t.symbol !== 'TON')) {
          try {
            const master = tonClient.open(JettonMaster.create(Address.parse(token.address)));
            const walletAddr = await master.getWalletAddress(userAddr);
            const jettonWallet = tonClient.open({
              address: walletAddr,
              async getBalance(provider: any) {
                const { stack } = await provider.get('get_wallet_data', []);
                return stack.readBigNumber();
              }
            } as any);
            const bal = await (jettonWallet as any).getBalance();
            newBalances[token.symbol] = (Number(bal) / Math.pow(10, token.decimals)).toFixed(2);
          } catch {
            newBalances[token.symbol] = '0.00';
          }
        }
        setBalances(newBalances);
      } catch { setBalances({}); }
    };
    fetchBalances();
  }, [wallet]);

  // Fetch live quote
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
          userWalletAddress: userAddress,
          proxyTon: new pTON.v1(),
          offerAmount,
          askJettonAddress: toToken.address,
          minAskAmount: '1',
          queryId: Date.now(),
        });
      } else if (toToken.symbol === 'TON') {
        txParams = await router.getSwapJettonToTonTxParams({
          userWalletAddress: userAddress,
          offerJettonAddress: fromToken.address,
          offerAmount,
          proxyTon: new pTON.v1(),
          minAskAmount: '1',
          queryId: Date.now(),
        });
      } else {
        txParams = await router.getSwapJettonToJettonTxParams({
          userWalletAddress: userAddress,
          offerJettonAddress: fromToken.address,
          offerAmount,
          askJettonAddress: toToken.address,
          minAskAmount: '1',
          queryId: Date.now(),
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

      alert('✨ Swap sent! Check your wallet in a few seconds.');
    } catch (e: any) {
      alert('Swap failed: ' + (e?.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const handleFlip = () => { setFromToken(toToken); setToToken(fromToken); setQuote(null); };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">✨ MagicTon</h1>
          <p className="text-purple-400">Swap tokens like magic on TON</p>
        </div>
        <div className="flex justify-center mb-4">
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
            <div className="text-right text-xs text-gray-500 mt-1">
              Balance: {balances[fromToken.symbol] ?? '—'} {fromToken.symbol}
            </div>
          </div>
          <div className="flex justify-center my-3">
            <button onClick={handleFlip} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all hover:rotate-180 duration-300">↕</button>
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