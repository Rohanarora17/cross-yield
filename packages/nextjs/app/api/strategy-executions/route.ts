import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EXECUTIONS_FILE = path.join(process.cwd(), 'data', 'strategy-executions.json');

interface CCTPTransfer {
  id: string;
  sourceChain: string;
  destinationChain: string;
  amount: number;
  status: 'initiated' | 'burned' | 'attested' | 'minted' | 'completed' | 'failed';
  txHash: string;
  progress: number;
  attestation?: string;
  estimatedTime?: string;
}

interface StrategyExecution {
  executionId: string;
  strategyId: string;
  amount: number;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  estimatedTime: string;
  createdAt: string;
  cctpTransfers: CCTPTransfer[];
  portfolioUpdate: {
    totalValue: number;
    currentAPY: number;
    allocations: Array<{
      protocol: string;
      chain: string;
      amount: number;
      percentage: number;
      apy: number;
    }>;
  };
}

interface ExecutionsData {
  executions: StrategyExecution[];
}

// GET - Retrieve all executions
export async function GET() {
  try {
    if (!fs.existsSync(EXECUTIONS_FILE)) {
      return NextResponse.json({ executions: [] });
    }

    const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    const executionsData: ExecutionsData = JSON.parse(data);
    
    return NextResponse.json(executionsData);
  } catch (error) {
    console.error('Error reading executions:', error);
    return NextResponse.json({ error: 'Failed to read executions' }, { status: 500 });
  }
}

// POST - Create new execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newExecution: StrategyExecution = {
      ...body,
      createdAt: new Date().toISOString(),
      status: body.status || 'initiated'
    };

    let executionsData: ExecutionsData = { executions: [] };
    
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
      executionsData = JSON.parse(data);
    }

    executionsData.executions.push(newExecution);
    
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executionsData, null, 2));
    
    return NextResponse.json(newExecution, { status: 201 });
  } catch (error) {
    console.error('Error creating execution:', error);
    return NextResponse.json({ error: 'Failed to create execution' }, { status: 500 });
  }
}

// PUT - Update execution
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, ...updates } = body;

    if (!fs.existsSync(EXECUTIONS_FILE)) {
      return NextResponse.json({ error: 'No executions found' }, { status: 404 });
    }

    const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    const executionsData: ExecutionsData = JSON.parse(data);

    const executionIndex = executionsData.executions.findIndex(
      exec => exec.executionId === executionId
    );

    if (executionIndex === -1) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    executionsData.executions[executionIndex] = {
      ...executionsData.executions[executionIndex],
      ...updates
    };

    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executionsData, null, 2));
    
    return NextResponse.json(executionsData.executions[executionIndex]);
  } catch (error) {
    console.error('Error updating execution:', error);
    return NextResponse.json({ error: 'Failed to update execution' }, { status: 500 });
  }
}

// PATCH - Add attestation to specific transfer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, transferId, attestation } = body;

    if (!fs.existsSync(EXECUTIONS_FILE)) {
      return NextResponse.json({ error: 'No executions found' }, { status: 404 });
    }

    const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    const executionsData: ExecutionsData = JSON.parse(data);

    const execution = executionsData.executions.find(
      exec => exec.executionId === executionId
    );

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const transfer = execution.cctpTransfers.find(
      t => t.id === transferId
    );

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Update transfer with attestation
    transfer.attestation = attestation;
    transfer.status = 'attested';
    transfer.progress = 87; // Attested status

    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executionsData, null, 2));
    
    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error adding attestation:', error);
    return NextResponse.json({ error: 'Failed to add attestation' }, { status: 500 });
  }
}

// DELETE - Remove completed execution
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID required' }, { status: 400 });
    }

    if (!fs.existsSync(EXECUTIONS_FILE)) {
      return NextResponse.json({ error: 'No executions found' }, { status: 404 });
    }

    const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    const executionsData: ExecutionsData = JSON.parse(data);

    const executionIndex = executionsData.executions.findIndex(
      exec => exec.executionId === executionId
    );

    if (executionIndex === -1) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Remove the execution
    executionsData.executions.splice(executionIndex, 1);

    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executionsData, null, 2));
    
    return NextResponse.json({ message: 'Execution removed successfully' });
  } catch (error) {
    console.error('Error removing execution:', error);
    return NextResponse.json({ error: 'Failed to remove execution' }, { status: 500 });
  }
}