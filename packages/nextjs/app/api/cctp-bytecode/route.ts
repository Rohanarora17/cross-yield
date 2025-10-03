// API route to serve CCTP bytecode for Aptos transactions
// This bytecode is required for completing CCTP bridge from Base to Aptos

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the compiled Move bytecode
    // This bytecode contains the handle_receive_message function
    const filePath = path.join(process.cwd(), 'public', 'bytecode', 'handle_receive_message.mv');

    // Read the bytecode file
    const bytecode = fs.readFileSync(filePath);

    console.log(`Serving CCTP bytecode: ${bytecode.length} bytes`);

    // Return as binary data
    return new NextResponse(bytecode, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving CCTP bytecode:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to load CCTP bytecode',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
