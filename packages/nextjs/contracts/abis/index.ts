import ChainRegistryABI from "./ChainRegistry.json";
import SmartWalletFactoryABI from "./SmartWalletFactory.json";
import YieldRouterABI from "./YieldRouter.json";

export { SmartWalletFactoryABI, ChainRegistryABI, YieldRouterABI };

// Re-export for better TypeScript support
export const smartWalletFactoryABI = SmartWalletFactoryABI;
export const chainRegistryABI = ChainRegistryABI;
export const yieldRouterABI = YieldRouterABI;
