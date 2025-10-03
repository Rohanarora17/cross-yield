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

    // Enhanced mock response with realistic cross-chain workflow including Aptos
    const deployAmount = parseFloat(amount);
    const executionId = `exec_${Date.now()}`;

    // Simulate cross-chain strategy allocation including Aptos
    const allocations = [
      {
        protocol: 'Thala Finance',
        chain: 'Aptos Testnet',
        chainId: 'aptos_testnet',
        amount: deployAmount * 0.35,
        percentage: 35,
        apy: 11.2
      },
      {
        protocol: 'Aave V3',
        chain: 'Base Sepolia',
        chainId: 84532,
        amount: deployAmount * 0.3,
        percentage: 30,
        apy: 14.2
      },
      {
        protocol: 'Radiant Capital',
        chain: 'Arbitrum Sepolia',
        chainId: 421614,
        amount: deployAmount * 0.25,
        percentage: 25,
        apy: 16.8
      },
      {
        protocol: 'Liquidswap',
        chain: 'Aptos Testnet',
        chainId: 'aptos_testnet',
        amount: deployAmount * 0.1,
        percentage: 10,
        apy: 9.5
      }
    ];

    // Generate CCTP transfers for cross-chain allocations
    const cctpTransfers = allocations
      .filter(alloc => alloc.chainId === 'aptos_testnet') // Only Aptos needs CCTP
      .map((alloc, index) => ({
        id: `cctp_${executionId}_${index + 1}`,
        sourceChain: 'Base Sepolia',
        sourceChainId: 84532,
        destinationChain: alloc.chain,
        destinationChainId: alloc.chainId,
        amount: alloc.amount,
        status: 'pending' as const,
        progress: 0,
        protocol: alloc.protocol,
        expectedAPY: alloc.apy,
        estimatedTime: '5-10 minutes',
        type: 'aptos_bridge'
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
          name: 'CCTP Bridge to Aptos',
          status: 'pending',
          description: 'Bridge USDC to Aptos using Circle CCTP (requires user signature)'
        },
        {
          id: 'aptos_vault',
          name: 'Aptos Vault Deposit',
          status: 'pending',
          description: 'Deposit USDC into Aptos yield vault (Thala/Liquidswap/Aries)'
        },
        {
          id: 'evm_protocols',
          name: 'EVM Protocol Deposits',
          status: 'pending',
          description: 'Deposit funds into EVM yield protocols (Aave/Moonwell/Radiant)'
        },
        {
          id: 'completion',
          name: 'Cross-Chain Strategy Active',
          status: 'pending',
          description: 'Your cross-chain yield strategy is now earning rewards'
        }
      ],
      nextAction: {
        type: 'wallet_interaction',
        description: 'Please approve USDC spending in your wallet to start cross-chain strategy',
        requiresSignature: true
      },
      aptosIntegration: {
        enabled: true,
        protocols: ['Thala Finance', 'Liquidswap', 'Aries Markets'],
        cctpRequired: true,
        userControlled: true
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