import { ethers } from 'ethers';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import {
  CHAIN_CONFIGS,
  CIRCLE_IRIS_API_BASE,
  BridgeParams,
  BridgeStatus,
  AttestationResponse
} from '../types/cctp';
import { DefiDataService } from './defiDataService';
import { OracleService } from './oracleService';

export class CCTPBridgeService {
  private bridgeStatuses = new Map<string, BridgeStatus>();
  private aptos: Aptos;
  private defiDataService: DefiDataService;
  private oracleService: OracleService;
  private adminAccount: Account;

  constructor() {
    const config = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(config);
    this.oracleService = new OracleService();
    this.defiDataService = new DefiDataService(this.oracleService);

    // Initialize admin account from private key
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('APTOS_PRIVATE_KEY environment variable is required');
    }

    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    this.adminAccount = Account.fromPrivateKey({ privateKey });

    console.log(`🔑 Initialized admin account: ${this.adminAccount.accountAddress.toString()}`);
    console.log(`🔐 Using private key from env: ${privateKeyHex.slice(0, 10)}...`);
  }

  // Generate unique bridge transaction ID
  private generateBridgeId(): string {
    return `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if vault is initialized and initialize if needed
  private async ensureVaultInitialized(): Promise<void> {
    const VAULT_ADMIN_ADDR = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";

    try {
      // Try to get vault stats to check if initialized
      const payload = {
        function: `${VAULT_ADMIN_ADDR}::native_usdc_vault_fa::get_vault_stats` as `${string}::${string}::${string}`,
        functionArguments: [VAULT_ADMIN_ADDR],
      };

      await this.aptos.view({ payload });
      console.log('✅ Vault is already initialized');

    } catch (error) {
      console.log('🏗️  Vault not initialized, initializing now...');

      try {
        // Build initialization transaction
        const transaction = await this.aptos.transaction.build.simple({
          sender: this.adminAccount.accountAddress,
          data: {
            function: `${VAULT_ADMIN_ADDR}::native_usdc_vault_fa::initialize`,
            functionArguments: []
          }
        });

        // Sign and submit the initialization transaction
        const senderAuthenticator = this.aptos.transaction.sign({
          signer: this.adminAccount,
          transaction
        });

        const committedTxn = await this.aptos.transaction.submit.simple({
          transaction,
          senderAuthenticator
        });

        // Wait for transaction confirmation
        await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

        console.log(`✅ Vault initialized successfully! TX: ${committedTxn.hash}`);

      } catch (initError) {
        console.error('❌ Failed to initialize vault:', initError);
        throw new Error(`Vault initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
      }
    }
  }

  // Convert Aptos address to bytes32 format for EVM
  private aptosAddressToBytes32(aptosAddress: string): string {
    const cleanAddress = aptosAddress.replace('0x', '');

    // Aptos addresses can be longer than 32 bytes, so we need to truncate or hash them
    // For CCTP, we need exactly 32 bytes (64 hex characters)
    if (cleanAddress.length > 64) {
      // If address is too long, take the last 64 characters (most significant part)
      const truncatedAddress = cleanAddress.slice(-64);
      return `0x${truncatedAddress}`;
    } else {
      // If address is shorter, pad with zeros at the beginning
      const paddedAddress = cleanAddress.padStart(64, '0');
      return `0x${paddedAddress}`;
    }
  }

  // Convert EVM address to Aptos format
  private evmAddressToAptos(evmAddress: string): string {
    return evmAddress.toLowerCase();
  }

  // Generate AI strategy for vault deposits
  private async generateVaultStrategy(amount: string): Promise<{
    protocol: string;
    apy: number;
    allocation: number;
  }> {
    try {
      // Get available Aptos protocols
      const protocols = await this.defiDataService.getAptosProtocols();

      // Filter for high-quality, high-yield options
      const suitableProtocols = protocols.filter(p =>
        p.verified &&
        p.tvl > 1000000 && // Min $1M TVL
        p.apy > 4 && // Min 4% APY
        p.apy < 20 // Max 20% APY to avoid suspicious yields
      );

      if (suitableProtocols.length === 0) {
        // Fallback strategy
        return {
          protocol: 'Thala Finance',
          apy: 8.5,
          allocation: 100
        };
      }

      // Sort by combination of APY and safety (TVL)
      suitableProtocols.sort((a, b) => {
        const scoreA = a.apy * 0.7 + (Math.log(a.tvl) / Math.log(10)) * 0.3;
        const scoreB = b.apy * 0.7 + (Math.log(b.tvl) / Math.log(10)) * 0.3;
        return scoreB - scoreA;
      });

      const bestProtocol = suitableProtocols[0];
      return {
        protocol: bestProtocol.name,
        apy: Math.round(bestProtocol.apy * 10) / 10,
        allocation: 100
      };

    } catch (error) {
      console.error('Error generating strategy:', error);
      // Fallback strategy
      return {
        protocol: 'Thala Finance',
        apy: 8.5,
        allocation: 100
      };
    }
  }

  // Start bridge from EVM to Aptos
  async initiateBridge(params: any): Promise<{ bridgeId: string; strategy?: any; txData?: any }> {
    const bridgeId = this.generateBridgeId();
    console.log(`🔍 Looking up chain configs: fromChain=${params.fromChain}, toChain=${params.toChain}`);
    console.log('🔗 Available chains:', Object.keys(CHAIN_CONFIGS));

    const fromConfig = CHAIN_CONFIGS[params.fromChain as keyof typeof CHAIN_CONFIGS];
    const toConfig = CHAIN_CONFIGS[params.toChain as keyof typeof CHAIN_CONFIGS];

    console.log(`📍 fromConfig found: ${!!fromConfig}, toConfig found: ${!!toConfig}`);

    if (!fromConfig || !toConfig) {
      throw new Error('Unsupported chain configuration');
    }

    // Generate strategy if destination is vault
    let strategy = null;
    if (params.destination === 'vault') {
      console.log(`🤖 Generating AI strategy for ${params.amount} USDC vault deposit...`);
      try {
        strategy = await this.generateVaultStrategy(params.amount);
      } catch (error) {
        console.error('⚠️  Strategy generation failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
        // Fallback strategy if AI generation fails
        strategy = {
          protocol: 'Thala Finance',
          apy: 8.5,
          allocation: 100
        };
      }
    }

    // Create bridge status with additional tracking data
    const status: BridgeStatus = {
      id: bridgeId,
      status: 'pending',
      createdAt: new Date(),
      // Add tracking for vault deposits
      destination: params.destination,
      userAddress: params.userAddress,
      evmAddress: params.evmAddress,
      amount: params.amount,
      strategy: strategy
    } as any;

    this.bridgeStatuses.set(bridgeId, status);

    // For EVM to Aptos bridge
    if (params.toChain === 'aptos') {
      const recipientBytes32 = this.aptosAddressToBytes32(params.recipientAddress);
      const amount = ethers.parseUnits(params.amount, 6); // USDC has 6 decimals

      const txData = {
        to: fromConfig.tokenMessenger,
        data: new ethers.Interface([
          'function depositForBurn(uint256 _amount, uint32 _destinationDomain, bytes32 _mintRecipient, address _burnToken) external'
        ]).encodeFunctionData('depositForBurn', [
          amount,
          toConfig.domain,
          recipientBytes32,
          fromConfig.usdc
        ])
      };

      return { bridgeId, strategy, txData };
    }

    throw new Error('Bridge direction not supported');
  }

  // Process burn transaction and extract message
  async processBurnTransaction(bridgeId: string, txHash: string, fromChain: keyof typeof CHAIN_CONFIGS): Promise<void> {
    const status = this.bridgeStatuses.get(bridgeId);
    if (!status) throw new Error('Bridge transaction not found');

    status.status = 'burning';
    status.txHash = txHash;
    this.bridgeStatuses.set(bridgeId, status);

    try {
      const provider = new ethers.JsonRpcProvider(CHAIN_CONFIGS[fromChain].rpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) throw new Error('Transaction receipt not found');

      // Extract MessageSent event
      const messageTransmitterInterface = new ethers.Interface([
        'event MessageSent(bytes message)'
      ]);

      let messageBytes: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = messageTransmitterInterface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed?.name === 'MessageSent') {
            messageBytes = parsed.args.message;
            break;
          }
        } catch (e) {
          // Continue to next log
        }
      }

      if (!messageBytes) throw new Error('MessageSent event not found');

      status.messageBytes = messageBytes;
      status.status = 'attesting';
      this.bridgeStatuses.set(bridgeId, status);

      // Start attestation polling
      this.pollForAttestation(bridgeId, messageBytes);

    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      this.bridgeStatuses.set(bridgeId, status);
    }
  }

  // Track active polling to prevent multiple instances
  private activePolling = new Set<string>();

  // Track completed bridges to prevent restarting polling
  private completedBridges = new Set<string>();

  // WebSocket notification method
  private notifyStatusUpdate(bridgeId: string, status: BridgeStatus) {
    console.log(`📡 WebSocket notification: Bridge ${bridgeId} status updated to ${status.status}`);

    // Mark bridge as completed if it reaches a final state
    if (status.status === 'minting' || status.status === 'completed' || status.status === 'failed') {
      this.completedBridges.add(bridgeId);
      console.log(`🔒 Bridge ${bridgeId} marked as completed, will not restart polling`);
    }

    // TODO: Integrate with your existing WebSocket server to broadcast to connected clients
    // This would eliminate the need for SSE polling entirely
    // Example: wss.broadcast({ type: 'bridge-status-update', bridgeId, status });
  }

  // Poll Circle's Iris API for attestation with improved error handling
  private async pollForAttestation(bridgeId: string, messageBytes: string): Promise<void> {
    // Check if bridge has already been completed (prevents restart after completion)
    if (this.completedBridges.has(bridgeId)) {
      // Silently block additional attempts to avoid log spam
      return;
    }

    // Check if bridge is already in final state
    const existingStatus = this.bridgeStatuses.get(bridgeId);
    if (existingStatus && (existingStatus.status === 'minting' || existingStatus.status === 'completed' || existingStatus.status === 'failed')) {
      console.log(`⚠️ Bridge ${bridgeId} already in final state (${existingStatus.status}), skipping polling`);
      this.completedBridges.add(bridgeId); // Mark as completed to prevent future restarts
      return;
    }

    // Prevent multiple polling instances for the same bridge
    if (this.activePolling.has(bridgeId)) {
      console.log(`⚠️ Polling already active for bridge ${bridgeId}, skipping duplicate call`);
      return;
    }

    this.activePolling.add(bridgeId);
    console.log(`🚀 Starting attestation polling for bridge ${bridgeId}`);

    const messageHash = ethers.keccak256(messageBytes);
    const maxAttempts = 120; // 20 minutes max (increased from 10)
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5; // Allow up to 5 consecutive errors before giving up

    const poll = async () => {
      attempts++;
      const status = this.bridgeStatuses.get(bridgeId);
      if (!status) {
        console.log(`❌ Bridge ${bridgeId} not found, stopping polling`);
        this.activePolling.delete(bridgeId);
        return;
      }

      // Check if status has already changed to final state
      if (status.status === 'minting' || status.status === 'completed' || status.status === 'failed') {
        console.log(`✅ Bridge ${bridgeId} already in final state (${status.status}), stopping polling`);
        this.activePolling.delete(bridgeId);
        return;
      }

      console.log(`🔍 Polling Circle API for attestation (attempt ${attempts}/${maxAttempts})...`);

      try {
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${CIRCLE_IRIS_API_BASE}/attestations/${messageHash}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-YieldFlow-Backend/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AttestationResponse = await response.json();
        console.log(`📊 Circle API response:`, { status: data.status, hasAttestation: !!data.attestation });

        if (data.status === 'complete' && data.attestation) {
          console.log(`✅ Attestation complete for bridge ${bridgeId} - STOPPING POLLING`);
          status.attestation = data.attestation;
          status.status = 'minting';
          this.bridgeStatuses.set(bridgeId, status);
          this.activePolling.delete(bridgeId); // Remove from active polling

          console.log(`🔄 Status updated to: ${JSON.stringify({ id: bridgeId, status: status.status, hasAttestation: !!status.attestation })}`);

          // Notify frontend via WebSocket
          this.notifyStatusUpdate(bridgeId, status);
          return; // This should stop the polling completely
        }

        // Reset consecutive errors on successful API call
        consecutiveErrors = 0;

        if (attempts < maxAttempts) {
          // Adaptive polling: faster initially, slower after 30 attempts
          const pollInterval = attempts < 30 ? 5000 : 15000; // 5s for first 30, then 15s
          console.log(`⏳ Scheduling next poll in ${pollInterval/1000}s...`);
          setTimeout(poll, pollInterval);
        } else {
          console.log(`⏰ Max attempts reached for bridge ${bridgeId}`);
          status.status = 'failed';
          status.error = 'Attestation timeout - Circle API did not return complete status';
          this.bridgeStatuses.set(bridgeId, status);
          this.activePolling.delete(bridgeId); // Remove from active polling
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Polling error (attempt ${attempts}, consecutive errors: ${consecutiveErrors}):`, error);

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.log(`💥 Too many consecutive errors (${consecutiveErrors}), giving up`);
          status.status = 'failed';
          status.error = `Attestation polling failed after ${consecutiveErrors} consecutive errors: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.bridgeStatuses.set(bridgeId, status);
          this.activePolling.delete(bridgeId); // Remove from active polling
          return;
        }

        if (attempts < maxAttempts) {
          // Exponential backoff for errors
          const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveErrors), 60000); // Max 1 minute
          console.log(`🔄 Retrying in ${backoffDelay/1000}s (exponential backoff)...`);
          setTimeout(poll, backoffDelay);
        } else {
          console.log(`⏰ Max attempts reached with errors for bridge ${bridgeId}`);
          status.status = 'failed';
          status.error = `Attestation polling failed after ${attempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.bridgeStatuses.set(bridgeId, status);
          this.activePolling.delete(bridgeId); // Remove from active polling
        }
      }
    };

    poll();
  }

  // Complete bridge by minting on Aptos
  async completeBridge(bridgeId: string): Promise<{ success: boolean, txHash?: string, transactions?: any[] }> {
    const status = this.bridgeStatuses.get(bridgeId);
    if (!status) throw new Error('Bridge transaction not found');
    if (status.status !== 'minting') throw new Error('Bridge not ready for completion');
    if (!status.messageBytes || !status.attestation) throw new Error('Missing message bytes or attestation');

    try {
      // Convert hex strings to Uint8Array for Aptos
      const messageBytes = new Uint8Array(
        status.messageBytes.slice(2).match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      const attestation = new Uint8Array(
        status.attestation.slice(2).match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      // Create transaction payload for minting USDC (proper wallet adapter format with correct address)
      const MESSAGE_TRANSMITTER_ADDR = "0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9";
      const mintTransaction = {
        data: {
          function: `${MESSAGE_TRANSMITTER_ADDR}::message_transmitter::receive_message`,
          functionArguments: [Array.from(messageBytes), Array.from(attestation)]
        }
      };

      // If destination is vault, also prepare vault deposit transaction
      const transactions = [mintTransaction];

      if (status.destination === 'vault' && status.amount) {
        console.log(`🏦 Preparing vault deposit for ${status.amount} USDC`);

        // Ensure vault is initialized before deposit
        await this.ensureVaultInitialized();

        // Vault contract address (from Move.toml)
        const VAULT_ADMIN_ADDR = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";

        // Convert amount to proper units (USDC has 6 decimals on Aptos)
        const amountInUnits = Math.floor(parseFloat(status.amount) * 1_000_000);

        // Create vault deposit transaction (proper SDK format)
        const vaultTransaction = {
          data: {
            function: `${VAULT_ADMIN_ADDR}::native_usdc_vault_fa::deposit`,
            functionArguments: [amountInUnits.toString(), VAULT_ADMIN_ADDR]  // Convert number to string for consistency
          }
        };

        transactions.push(vaultTransaction as any);
        console.log(`💰 Vault deposit prepared: ${amountInUnits} USDC units (${amountInUnits.toString()})`);
        console.log(`💡 IMPORTANT: Ensure vault is initialized first by admin: ${VAULT_ADMIN_ADDR}`);
      }

      status.status = 'completed';
      status.completedAt = new Date();
      this.bridgeStatuses.set(bridgeId, status);

      return {
        success: true,
        txHash: undefined, // Will be set after user signs
        transactions // Return array of transactions for frontend to execute
      } as any;

    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      this.bridgeStatuses.set(bridgeId, status);

      return { success: false };
    }
  }

  // Get bridge status
  getBridgeStatus(bridgeId: string): BridgeStatus | null {
    return this.bridgeStatuses.get(bridgeId) || null;
  }

  // Get all bridge statuses (for admin/debugging)
  getAllBridgeStatuses(): BridgeStatus[] {
    return Array.from(this.bridgeStatuses.values());
  }

  // Retry failed bridge attestation polling
  async retryBridgeAttestation(bridgeId: string): Promise<{ success: boolean, message: string }> {
    const status = this.bridgeStatuses.get(bridgeId);
    if (!status) {
      return { success: false, message: 'Bridge not found' };
    }

    if (status.status !== 'failed') {
      return { success: false, message: 'Bridge is not in failed state' };
    }

    if (!status.messageBytes) {
      return { success: false, message: 'No messageBytes available for retry' };
    }

    console.log(`🔄 Retrying attestation polling for bridge ${bridgeId}`);
    status.status = 'attesting';
    status.error = undefined;
    this.bridgeStatuses.set(bridgeId, status);

    // Clear any existing polling state and restart (allow retry even if previously completed)
    this.activePolling.delete(bridgeId);
    this.completedBridges.delete(bridgeId); // Allow retry by removing from completed set
    this.pollForAttestation(bridgeId, status.messageBytes);

    return { success: true, message: 'Attestation polling restarted' };
  }
}