import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.ston.fi/v1/assets/${address}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Token not found on STON.fi' }, { status: 404 });
    }
    const data = await res.json();
    const asset = data?.asset;
    if (!asset) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    return NextResponse.json({
      symbol: asset.symbol ?? 'UNKNOWN',
      name: asset.displayName ?? asset.symbol ?? 'Unknown Token',
      decimals: asset.decimals ?? 9,
      image: asset.imageUrl ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch token info' }, { status: 500 });
  }
}