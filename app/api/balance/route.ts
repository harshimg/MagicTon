import { NextRequest, NextResponse } from 'next/server';

const TON_API_KEY = process.env.TON_API_KEY;

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

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const ownerAddress = searchParams.get('owner_address');
  const jettonAddress = searchParams.get('jetton_address');

  if (!ownerAddress) {
    return NextResponse.json({ error: 'Missing owner_address' }, { status: 400 });
  }

  try {
    if (jettonAddress) {
      const res = await fetch(
        `https://toncenter.com/api/v3/jetton/wallets?owner_address=${ownerAddress}&jetton_address=${jettonAddress}&limit=1&api_key=${TON_API_KEY}`
      );
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const res = await fetch(
        `https://toncenter.com/api/v2/getAddressBalance?address=${ownerAddress}&api_key=${TON_API_KEY}`
      );
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    return NextResponse.json({ error: 'Balance fetch failed' }, { status: 500 });
  }
}