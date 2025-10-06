/**
 * USDC FA Test Component
 * Tests the USDC FA balance fetching with correct addresses
 */

"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { APTOS_CONFIG } from "../config/aptos.config";

// USDC FA metadata address (official Circle USDC on Aptos)
// Use the correct address based on network
const USDC_FA_METADATA = APTOS_CONFIG.network === "mainnet" 
  ? "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"  // Mainnet
  : "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"; // Testnet
const USDC_TYPE = `${USDC_FA_METADATA}::coin::USDC`;

export function USDCFATest() {
  const { account, connected } = useWallet();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testUSDCBalance = async () => {
    if (!account || !connected) {
      setTestResult({ error: "Wallet not connected" });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const config = new AptosConfig({ 
        network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET 
      });
      const aptos = new Aptos(config);

      console.log("Testing USDC FA balance for:", account.address);
      console.log("USDC Type:", USDC_TYPE);

      // Test 1: Get account resources
      const resources = await aptos.getAccountResources({
        accountAddress: account.address,
      });

      console.log("All resources:", resources.length);

      // Test 2: Try to get USDC FA balance directly
      const usdcResource = await aptos.getAccountResource({
        accountAddress: account.address,
        resourceType: `0x1::coin::CoinStore<${USDC_TYPE}>`,
      });

      if (usdcResource && usdcResource.data) {
        const data = usdcResource.data as any;
        const rawBalance = data.coin?.value || "0";
        const formattedBalance = Number(rawBalance) / 1e6;

        setTestResult({
          success: true,
          usdcType: USDC_TYPE,
          rawBalance: rawBalance,
          formattedBalance: formattedBalance,
          resourceData: data,
        });
      } else {
        setTestResult({
          success: false,
          error: "No USDC resource found",
          usdcType: USDC_TYPE,
        });
      }
    } catch (error: any) {
      console.error("USDC FA test error:", error);
      setTestResult({
        success: false,
        error: error.message,
        status: error.status,
        usdcType: USDC_TYPE,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>USDC FA Balance Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>USDC FA Metadata:</strong> {USDC_FA_METADATA}
          </div>
          <div className="text-sm">
            <strong>USDC Type:</strong> {USDC_TYPE}
          </div>
          <div className="text-sm">
            <strong>Account:</strong> {account?.address || "Not connected"}
          </div>
        </div>

        <Button onClick={testUSDCBalance} disabled={loading || !connected}>
          {loading ? "Testing..." : "Test USDC FA Balance"}
        </Button>

        {testResult && (
          <div className="space-y-2">
            <Badge variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? "Success" : "Failed"}
            </Badge>
            
            {testResult.success ? (
              <div className="space-y-1 text-sm">
                <div><strong>Raw Balance:</strong> {testResult.rawBalance}</div>
                <div><strong>Formatted Balance:</strong> {testResult.formattedBalance} USDC</div>
                <div><strong>USDC Type:</strong> {testResult.usdcType}</div>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-red-600">
                <div><strong>Error:</strong> {testResult.error}</div>
                {testResult.status && <div><strong>Status:</strong> {testResult.status}</div>}
                <div><strong>USDC Type:</strong> {testResult.usdcType}</div>
              </div>
            )}

            <details className="text-xs">
              <summary>Raw Response</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}