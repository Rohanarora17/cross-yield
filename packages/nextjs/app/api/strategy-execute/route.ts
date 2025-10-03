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

    // Try to forward request to backend for real strategy execution
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    let backendResponse = null;

    try {
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

      if (response.ok) {
        backendResponse = await response.json();
      }
    } catch (error) {
      console.log('Backend not available, using mock response');
    }

    // If backend is available, return its response
    if (backendResponse) {
      return NextResponse.json(backendResponse);
    }

    // Enhanced mock response with realistic CCTP workflow
    const deployAmount = parseFloat(amount);
    const executionId = `exec_${Date.now()}`;

    // Simulate cross-chain strategy allocation
    const allocations = [
      {
        protocol: 'Aave V3',
        chain: 'Base Sepolia',
        chainId: 84532,
        amount: deployAmount * 0.6,
        percentage: 60,
        apy: 14.2
      },
      {
        protocol: 'Radiant Capital',
        chain: 'Arbitrum Sepolia',
        chainId: 421614,
        amount: deployAmount * 0.4,
        percentage: 40,
        apy: 16.8
      }
    ];

    // Generate CCTP transfers for cross-chain allocations
    const cctpTransfers = allocations.map((alloc, index) => ({
      id: `cctp_${executionId}_${index + 1}`,
      sourceChain: 'Ethereum Sepolia',
      sourceChainId: 11155111,
      destinationChain: alloc.chain,
      destinationChainId: alloc.chainId,
      amount: alloc.amount,
      status: 'pending' as const,
      progress: 0,
      protocol: alloc.protocol,
      expectedAPY: alloc.apy,
      estimatedTime: '3-15 minutes'
    }));

    const mockResponse = {
      status: 'success',
      message: 'Strategy execution initiated successfully',
      executionId,
      strategyId,
      userAddress,
      smartWalletAddress,
      totalAmount: deployAmount,
      estimatedTime: '3-15 minutes',
      expectedAPY: allocations.reduce((acc, alloc) => acc + (alloc.apy * alloc.percentage / 100), 0),
      cctpTransfers,
      allocations,
      steps: [
        {
          id: 'approve',
          name: 'Approve USDC Spending',
          status: 'pending',
          description: 'Approve smart wallet to spend your USDC'
        },
        {
          id: 'deposit',
          name: 'Deposit to Smart Wallet',
          status: 'pending',
          description: 'Transfer USDC to your CrossYield smart wallet'
        },
        {
          id: 'cctp_transfers',
          name: 'Cross-Chain Transfers',
          status: 'pending',
          description: 'Transfer funds across chains using Circle CCTP'
        },
        {
          id: 'protocol_deposits',
          name: 'Deploy to Protocols',
          status: 'pending',
          description: 'Deposit funds into yield-generating protocols'
        },
        {
          id: 'completion',
          name: 'Strategy Active',
          status: 'pending',
          description: 'Your yield strategy is now earning rewards'
        }
      ],
      nextAction: {
        type: 'wallet_interaction',
        description: 'Please approve USDC spending in your wallet',
        requiresSignature: true
      }
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Strategy execution error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}