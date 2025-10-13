/**
 * Component to test GraphQL queries directly
 */

"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { APTOS_CONFIG } from "../config/aptos.config";

const SIMPLE_QUERY = `
  query GetAccountInfo($address: String!) {
    accounts(where: { address: { _eq: $address } }) {
      address
      sequence_number
      authentication_key
    }
  }
`;

const FUNGIBLE_ASSETS_QUERY = `
  query GetFungibleAssetBalances($address: String!) {
    current_fungible_asset_balances(
      where: { owner_address: { _eq: $address } }
      limit: 10
    ) {
      asset_type
      amount
      __typename
    }
  }
`;

const SIMPLE_FUNGIBLE_QUERY = `
  query {
    current_fungible_asset_balances(limit: 5) {
      asset_type
      amount
      __typename
    }
  }
`;

export function GraphQLTest() {
  const { account, connected } = useWallet();
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGraphQL = async () => {
    if (!account?.address || !connected) {
      alert("Please connect your Aptos wallet first");
      return;
    }

    setLoading(true);
    setTestResults(null);

    try {
      console.log("🔍 Testing GraphQL endpoint:", APTOS_CONFIG.indexerUrl);
      console.log("🔍 Testing with address:", account.address);

      // Test 1: Simple account query
      const accountResponse = await fetch(APTOS_CONFIG.indexerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: SIMPLE_QUERY,
          variables: {
            address: account.address,
          },
        }),
      });

      const accountData = await accountResponse.json();
      console.log("📊 Account query result:", accountData);

      // Test 2: Simple fungible assets query (no variables)
      const simpleAssetsResponse = await fetch(APTOS_CONFIG.indexerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: SIMPLE_FUNGIBLE_QUERY,
        }),
      });

      const simpleAssetsData = await simpleAssetsResponse.json();
      console.log("📊 Simple assets query result:", simpleAssetsData);

      // Test 3: Fungible assets query with address
      const assetsResponse = await fetch(APTOS_CONFIG.indexerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: FUNGIBLE_ASSETS_QUERY,
          variables: {
            address: account.address,
          },
        }),
      });

      const assetsData = await assetsResponse.json();
      console.log("📊 Assets query result:", assetsData);

      setTestResults({
        accountQuery: {
          success: accountResponse.ok,
          status: accountResponse.status,
          data: accountData,
        },
        simpleAssetsQuery: {
          success: simpleAssetsResponse.ok,
          status: simpleAssetsResponse.status,
          data: simpleAssetsData,
        },
        assetsQuery: {
          success: assetsResponse.ok,
          status: assetsResponse.status,
          data: assetsData,
        },
      });

    } catch (error: any) {
      console.error("❌ GraphQL test error:", error);
      setTestResults({
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔍 GraphQL Endpoint Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Testing GraphQL endpoint connectivity and queries.
        </div>
        
        <div className="text-xs font-mono bg-muted p-2 rounded">
          Endpoint: {APTOS_CONFIG.indexerUrl}
        </div>
        
        <Button 
          onClick={testGraphQL} 
          disabled={loading || !connected}
          className="w-full"
        >
          {loading ? "Testing..." : "Test GraphQL Queries"}
        </Button>

        {testResults && (
          <div className="space-y-4">
            <h3 className="font-semibold">Test Results:</h3>
            
            {testResults.error ? (
              <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                <div className="text-red-600 font-medium">Error:</div>
                <div className="text-red-600 text-sm">{testResults.error}</div>
              </div>
            ) : (
              <>
                {/* Account Query Results */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Account Query</span>
                    <Badge variant={testResults.accountQuery?.success ? "default" : "destructive"}>
                      {testResults.accountQuery?.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    <div>Status: {testResults.accountQuery?.status}</div>
                    <div className="mt-2">
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(testResults.accountQuery?.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Simple Assets Query Results */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Simple Fungible Assets Query</span>
                    <Badge variant={testResults.simpleAssetsQuery?.success ? "default" : "destructive"}>
                      {testResults.simpleAssetsQuery?.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    <div>Status: {testResults.simpleAssetsQuery?.status}</div>
                    <div className="mt-2">
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(testResults.simpleAssetsQuery?.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Assets Query Results */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Fungible Assets Query (with address)</span>
                    <Badge variant={testResults.assetsQuery?.success ? "default" : "destructive"}>
                      {testResults.assetsQuery?.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    <div>Status: {testResults.assetsQuery?.status}</div>
                    <div className="mt-2">
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(testResults.assetsQuery?.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}