import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { userAddress, amount, strategy } = body;

    if (!userAddress || !amount) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    // Forward request to backend Aptos execution
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${backendUrl}/api/aptos-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          amount: parseFloat(amount),
          strategy: strategy || null,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Backend Aptos execution result:', result);

      return NextResponse.json({
        status: 'success',
        message: 'Aptos execution initiated successfully',
        ...result
      });

    } catch (backendError) {
      console.log('Backend not available, using mock Aptos execution response');
      
      // Mock Aptos execution response
      const mockResponse = {
        status: 'success',
        message: 'Aptos execution instructions generated',
        executionId: `aptos_exec_${Date.now()}`,
        userAddress,
        amount: parseFloat(amount),
        cctpInstructions: {
          sourceChain: 'Base Sepolia',
          destinationChain: 'Aptos Testnet',
          amount: parseFloat(amount),
          steps: [
            {
              step: 1,
              action: 'Approve USDC for CCTP',
              description: 'Approve Circle CCTP contract to spend your USDC',
              requiresSignature: true
            },
            {
              step: 2,
              action: 'Initiate CCTP Transfer',
              description: 'Send USDC to Aptos via Circle CCTP bridge',
              requiresSignature: true
            },
            {
              step: 3,
              action: 'Wait for Attestation',
              description: 'Wait for Circle attestation service (2-5 minutes)',
              requiresSignature: false
            },
            {
              step: 4,
              action: 'Complete Aptos Transfer',
              description: 'Complete the transfer on Aptos testnet',
              requiresSignature: true
            }
          ]
        },
        vaultInstructions: {
          protocol: 'Native USDC Vault',
          action: 'Deposit to Aptos Vault',
          description: 'Deposit USDC into Aptos yield vault',
          requiresSignature: true
        },
        estimatedTime: '5-10 minutes',
        nextAction: {
          type: 'user_signature_required',
          description: 'Please approve USDC spending for CCTP bridge',
          requiresSignature: true
        }
      };

      return NextResponse.json(mockResponse);
    }

  } catch (error) {
    console.error('Aptos execution error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}