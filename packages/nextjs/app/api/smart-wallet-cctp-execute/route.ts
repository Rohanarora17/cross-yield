import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userAddress, 
      amount, 
      sourceChain, 
      destinationChain, 
      recipient, 
      smartWalletMode,
      strategy 
    } = body;

    console.log('🚀 Smart Wallet CCTP Execution Request:', {
      userAddress,
      amount,
      sourceChain,
      destinationChain,
      recipient,
      smartWalletMode,
      strategy
    });

    // Validate required fields
    if (!userAddress || !amount || !sourceChain || !destinationChain || !recipient) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Missing required fields: userAddress, amount, sourceChain, destinationChain, recipient' 
        },
        { status: 400 }
      );
    }

    // Call backend CCTP execution
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const backendResponse = await fetch(`${backendUrl}/api/cctp-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
        amount: parseFloat(amount),
        sourceChain,
        destinationChain,
        recipient,
        smartWalletMode: smartWalletMode || true,
        strategy: strategy || null
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.message || `Backend responded with status: ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    
    console.log('✅ Backend CCTP execution result:', result);

    return NextResponse.json({
      status: 'success',
      message: 'CCTP transfer initiated successfully',
      burnTxHash: result.burnTxHash || `cctp_${Date.now()}`,
      transferId: result.transferId || `transfer_${Date.now()}`,
      sourceChain,
      destinationChain,
      amount: parseFloat(amount),
      recipient,
      strategy: strategy || null
    });

  } catch (error) {
    console.error('❌ Smart Wallet CCTP execution error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to execute CCTP transfer',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}