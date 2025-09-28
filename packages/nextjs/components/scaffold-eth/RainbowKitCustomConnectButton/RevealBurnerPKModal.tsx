import { useRef, useState } from "react";
import { rainbowkitBurnerWallet } from "burner-connector";
import { ShieldExclamationIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

export const RevealBurnerPKModal = () => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const modalCheckboxRef = useRef<HTMLInputElement>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");

  const loadPrivateKey = () => {
    try {
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
      const burnerPK = storage?.getItem(BURNER_WALLET_PK_KEY);
      if (!burnerPK) throw new Error("Burner wallet private key not found");
      setPrivateKey(burnerPK);
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
      if (modalCheckboxRef.current) modalCheckboxRef.current.checked = false;
    }
  };

  const handleCopyPK = async () => {
    if (!privateKey) {
      loadPrivateKey();
      return;
    }
    try {
      await copyToClipboard(privateKey);
      notification.success("Burner wallet private key copied to clipboard");
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
    }
  };

  const handleShowPrivateKey = () => {
    if (!privateKey) {
      loadPrivateKey();
    }
    setShowPrivateKey(!showPrivateKey);
  };

  return (
    <>
      <div>
        <input type="checkbox" id="reveal-burner-pk-modal" className="modal-toggle" ref={modalCheckboxRef} />
        <label htmlFor="reveal-burner-pk-modal" className="modal cursor-pointer">
          <label className="modal-box relative">
            {/* dummy input to capture event onclick on modal box */}
            <input className="h-0 w-0 absolute top-0 left-0" />
            <label htmlFor="reveal-burner-pk-modal" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
              ✕
            </label>
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Burner Wallet Private Key</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Development wallet - not for real funds
                </p>
              </div>
              
              <div role="alert" className="alert alert-warning">
                <ShieldExclamationIcon className="h-5 w-5" />
                <div className="text-sm">
                  <div className="font-semibold">⚠️ Development Only</div>
                  <div>This wallet is for local development and testing only.</div>
                  <div className="mt-1 text-xs">
                    Never use burner wallets for real funds or mainnet transactions.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Private Key:</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleShowPrivateKey}
                  >
                    {showPrivateKey ? (
                      <>
                        <EyeSlashIcon className="h-4 w-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Show
                      </>
                    )}
                  </button>
                </div>
                
                {showPrivateKey && privateKey && (
                  <div className="p-3 bg-base-200 rounded-lg border">
                    <div className="font-mono text-xs break-all select-all">
                      {privateKey}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button 
                    className="btn btn-primary btn-sm flex-1" 
                    onClick={handleCopyPK} 
                    disabled={isCopiedToClipboard || !privateKey}
                  >
                    {isCopiedToClipboard ? (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Private key is stored temporarily in your browser</p>
                <p>• Provides full access to wallet and funds</p>
                <p>• Use only for development and testing</p>
              </div>
            </div>
          </label>
        </label>
      </div>
    </>
  );
};
