import { NextRequest, NextResponse } from 'next/server';
import { StonApiClient } from '@ston-fi/api';

const stonApiClient = new StonApiClient();

const WHITELISTED_TOKENS: Record<string, { address: string; decimals: number }> = {
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c': { address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', decimals: 9 },
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': { address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', decimals: 6 },
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO': { address: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO', decimals: 9 },
  'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT': { address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', decimals: 9 },
  'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8': { address: 'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8', decimals: 9 },
};

const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimit.get(ip);
  if (!limit || now > limit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 100) return false;
  limit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { offerAddress, askAddress, amount, decimals, slippage } = await req.json();

    if (!offerAddress || !askAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!WHITELISTED_TOKENS[offerAddress] || !WHITELISTED_TOKENS[askAddress]) {
      return NextResponse.json({ error: 'Token not whitelisted' }, { status: 403 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const parsedSlippage = parseFloat(slippage || '1');
    if (isNaN(parsedSlippage) || parsedSlippage <= 0 || parsedSlippage > 50) {
      return NextResponse.json({ error: 'Invalid slippage' }, { status: 400 });
    }

    const units = Math.floor(parsedAmount * Math.pow(10, decimals)).toString();
    const result = await stonApiClient.simulateSwap({
      offerAddress,
      askAddress,
      offerUnits: units,
      slippageTolerance: (parseFloat(slippage || '1') / 100).toString(),
    });

    return NextResponse.json({ askUnits: result.askUnits });
  } catch {
    return NextResponse.json({ error: 'Swap simulation failed' }, { status: 500 });
  }
}