/**
 * Component to test different USDC FA addresses and verify which one works
 */

"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { APTOS_CONFIG } from "../config/aptos.config";

// Different USDC FA addresses to test
const USDC_ADDRESSES = [
  {
    name: "Provided Testnet Address",
    address: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    type: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::coin::USDC"
  },
  {
    name: "Mainnet Address (for comparison)",
    address: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
    type: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::coin::USDC"
  },
  {
    name: "Alternative Testnet Address 1",
    address: "0x1::coin::USDC",
    type: "0x1::coin::USDC"
  },
  {
    name: "Alternative Testnet Address 2",
    address: "0x1::coin::CoinStore<0x1::coin::USDC>",
    type: "0x1::coin::CoinStore<0x1::coin::USDC>"
  },
  {
    name: "Alternative Testnet Address 3",
    address: "0x1::coin::CoinStore<0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::coin::USDC>",
    type: "0x1::coin::CoinStore<0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::coin::USDC>"
  }
];

export function USDCFAAddressTest() {
  const { account, connected } = useWallet();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAddresses = async () => {
    if (!account?.address || !connected) {
      alert("Please connect your Aptos wallet first");
      return;
    }

    setLoading(true);
    setTestResults([]);

    const config = new AptosConfig({ 
      network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET 
    });
    const aptos = new Aptos(config);

    const results = [];

    for (const usdcAddress of USDC_ADDRESSES) {
      try {
        console.log(`Testing ${usdcAddress.name}: ${usdcAddress.type}`);
        
        const resource = await aptos.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<${usdcAddress.type}>`,
        });

        if (resource && resource.data) {
          const data = resource.data as any;
          const rawBalance = data.coin?.value || "0";
          const balance = Number(rawBalance) / 1e6; // USDC has 6 decimals
          
          results.push({
            name: usdcAddress.name,
            address: usdcAddress.address,
            type: usdcAddress.type,
            success: true,
            balance: balance,
            rawBalance: rawBalance,
            error: null
          });
          
          console.log(`✅ ${usdcAddress.name} - Balance: ${balance} USDC`);
        } else {
          results.push({
            name: usdcAddress.name,
            address: usdcAddress.address,
            type: usdcAddress.type,
            success: false,
            balance: 0,
            rawBalance: "0",
            error: "No data returned"
          });
        }
      } catch (error: any) {
        results.push({
          name: usdcAddress.name,
          address: usdcAddress.address,
          type: usdcAddress.type,
          success: false,
          balance: 0,
          rawBalance: "0",
          error: error.message
        });
        
        console.log(`❌ ${usdcAddress.name} - Error: ${error.message}`);
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔍 USDC FA Address Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Testing different USDC FA addresses to find the correct one for testnet.
        </div>
        
        <Button 
          onClick={testAddresses} 
          disabled={loading || !connected}
          className="w-full"
        >
          {loading ? "Testing..." : "Test USDC Addresses"}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.name}</span>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                
                <div className="text-xs space-y-1">
                  <div><strong>Address:</strong> {result.address}</div>
                  <div><strong>Type:</strong> <code className="text-blue-600">{result.type}</code></div>
                  
                  {result.success ? (
                    <div className="text-green-600">
                      <div><strong>Balance:</strong> {result.balance.toFixed(6)} USDC</div>
                      <div><strong>Raw:</strong> {result.rawBalance}</div>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <div><strong>Error:</strong> {result.error}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}