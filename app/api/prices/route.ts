import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(req: NextRequest) {
  try {
    const ids = 'the-open-network,ston-2,notcoin,gmt-token,bitcoin,ethereum';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 });
  }
}