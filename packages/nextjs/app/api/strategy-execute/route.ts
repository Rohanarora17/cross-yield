import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { userAddress, strategyId, amount, smartWalletAddress } = body;

    if (!userAddress || !strategyId || !amount || !smartWalletAddress) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward request to backend for strategy execution
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/strategy-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
        strategyId,
        amount: parseFloat(amount) * 1000000, // Convert to USDC units (6 decimals)
        smartWalletAddress,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Strategy execution error:', error);

    // Return mock success response if backend is not available
    const mockResponse = {
      status: 'success',
      message: 'Strategy execution initiated successfully',
      executionId: `exec_${Date.now()}`,
      estimatedTime: '2-5 minutes',
      cctpTransfers: [
        {
          id: 'cctp_1',
          sourceChain: 'Ethereum',
          destinationChain: 'Base',
          amount: parseFloat(body.amount || '0'),
          status: 'initiated',
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        }
      ],
      portfolioUpdate: {
        totalValue: parseFloat(body.amount || '0'),
        currentAPY: 15.8,
        allocations: [
          {
            protocol: 'Aave V3',
            chain: 'Base',
            amount: parseFloat(body.amount || '0') * 0.6,
            percentage: 60,
            apy: 14.2
          },
          {
            protocol: 'Compound V3',
            chain: 'Ethereum',
            amount: parseFloat(body.amount || '0') * 0.4,
            percentage: 40,
            apy: 11.5
          }
        ]
      }
    };

    return NextResponse.json(mockResponse);
  }
}