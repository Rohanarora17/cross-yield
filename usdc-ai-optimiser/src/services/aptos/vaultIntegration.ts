import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

export class VaultIntegrationService {
  private aptos: Aptos;
  private vaultAdmin?: Account;
  private contractAddress = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";

  constructor() {
    const config = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(config);

    // Initialize admin account if private key is provided
    if (process.env.APTOS_VAULT_ADMIN_KEY) {
      try {
        const privateKey = new Ed25519PrivateKey(process.env.APTOS_VAULT_ADMIN_KEY);
        this.vaultAdmin = Account.fromPrivateKey({ privateKey });
      } catch (error) {
        console.warn('Invalid APTOS_VAULT_ADMIN_KEY provided');
      }
    }
  }

  // Get vault stats for dashboard display (simplified for demo)
  async getVaultStats(adminAddress: string): Promise<{
    totalDeposits: number;
    totalYield: number;
    userCount: number;
  }> {
    // For hackathon demo, return mock data since view function calls are complex
    return {
      totalDeposits: 12500, // Mock: $12.5K deposited
      totalYield: 245,      // Mock: $245 yield earned
      userCount: 8          // Mock: 8 users
    };
  }

  // Get user position in vault (simplified for demo)
  async getUserPosition(userAddress: string): Promise<{
    principal: number;
    yieldEarned: number;
    totalBalance: number;
    lastDepositTime: number;
    lastWithdrawTime: number;
  }> {
    // For hackathon demo, return mock data
    return {
      principal: 1000,       // Mock: $1K deposited
      yieldEarned: 23.45,    // Mock: $23.45 yield
      totalBalance: 1023.45, // Mock: $1,023.45 total
      lastDepositTime: Date.now() - 86400000, // 1 day ago
      lastWithdrawTime: 0
    };
  }

  // Get vault resource address for deposits (simplified)
  async getVaultResourceAddress(adminAddress: string): Promise<string | null> {
    // For demo, return the admin address as resource address
    // In reality this would be a derived resource account address
    return `${adminAddress}_resource_vault`;
  }

  // Initialize vault (admin only)
  async initializeVault(): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.vaultAdmin) {
      return { success: false, error: 'Vault admin not configured' };
    }

    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.vaultAdmin.accountAddress,
        data: {
          function: `${this.contractAddress}::native_usdc_vault_fa::initialize`,
          functionArguments: []
        }
      });

      const pendingTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.vaultAdmin,
        transaction
      });

      const committedTxn = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash
      });

      return {
        success: committedTxn.success,
        txHash: pendingTxn.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Add yield to user position (admin only)
  async addYieldToUser(
    userAddress: string,
    yieldAmount: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.vaultAdmin) {
      return { success: false, error: 'Vault admin not configured' };
    }

    try {
      const yieldAmountMicro = Math.floor(yieldAmount * 1_000_000); // Convert to micro USDC

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.vaultAdmin.accountAddress,
        data: {
          function: `${this.contractAddress}::native_usdc_vault_fa::add_yield`,
          functionArguments: [userAddress, yieldAmountMicro]
        }
      });

      const pendingTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.vaultAdmin,
        transaction
      });

      const committedTxn = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash
      });

      return {
        success: committedTxn.success,
        txHash: pendingTxn.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate deposit transaction for user (to be signed by user)
  generateDepositTransaction(userAddress: string, amount: number, adminAddress: string) {
    const amountMicro = Math.floor(amount * 1_000_000); // Convert to micro USDC

    return {
      function: `${this.contractAddress}::native_usdc_vault_fa::deposit`,
      functionArguments: [amountMicro, adminAddress],
      // Note: User will need to sign this transaction themselves
    };
  }

  // Generate withdraw transaction for user (admin signs)
  async generateWithdrawTransaction(
    userAddress: string,
    amount: number
  ): Promise<{ success: boolean; transaction?: any; error?: string }> {
    if (!this.vaultAdmin) {
      return { success: false, error: 'Vault admin not configured' };
    }

    try {
      const amountMicro = Math.floor(amount * 1_000_000); // Convert to micro USDC

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.vaultAdmin.accountAddress,
        data: {
          function: `${this.contractAddress}::native_usdc_vault_fa::withdraw`,
          functionArguments: [userAddress, amountMicro]
        }
      });

      return {
        success: true,
        transaction
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}