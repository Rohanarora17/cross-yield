import { useRef, useState } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { getAddress } from "viem";
import { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar, isENS } from "~~/components/scaffold-eth";
import { useCopyToClipboard, useOutsideClick } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const BURNER_WALLET_ID = "burnerWallet";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayName: string;
  ensAvatar?: string;
};

export const AddressInfoDropdown = ({
  address,
  ensAvatar,
  displayName,
  blockExplorerAddressLink,
}: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const checkSumAddress = getAddress(address);

  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <>
      <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
        <summary className="flex items-center space-x-2 px-2 py-1 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
          <BlockieAvatar address={checkSumAddress} size={24} ensImage={ensAvatar} />
          <span className="text-sm font-medium text-foreground">
            {isENS(displayName) ? displayName : checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4)}
          </span>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </summary>
        <ul className="dropdown-content menu z-50 p-2 mt-2 shadow-lg bg-background border border-border/50 rounded-lg min-w-[200px] gap-1">
          <NetworkOptions hidden={!selectingNetwork} />
          <li className={selectingNetwork ? "hidden" : ""}>
            <div
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
              onClick={() => copyAddressToClipboard(checkSumAddress)}
            >
              {isAddressCopiedToClipboard ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">Copy address</span>
                </>
              )}
            </div>
          </li>
          <li className={selectingNetwork ? "hidden" : ""}>
            <a
              target="_blank"
              href={blockExplorerAddressLink}
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">View on Block Explorer</span>
            </a>
          </li>
          {allowedNetworks.length > 1 ? (
            <li className={selectingNetwork ? "hidden" : ""}>
              <button
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md transition-colors w-full text-left"
                type="button"
                onClick={() => {
                  setSelectingNetwork(true);
                }}
              >
                <ArrowsRightLeftIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Switch Network</span>
              </button>
            </li>
          ) : null}
          {connector?.id === BURNER_WALLET_ID ? (
            <li>
              <label htmlFor="reveal-burner-pk-modal" className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer text-red-500">
                <EyeIcon className="h-4 w-4" />
                <span className="text-sm">Reveal Private Key</span>
              </label>
            </li>
          ) : null}
          <li className={selectingNetwork ? "hidden" : ""}>
            <button
              className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 rounded-md transition-colors w-full text-left text-red-500"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftOnRectangleIcon className="h-4 w-4" />
              <span className="text-sm">Disconnect</span>
            </button>
          </li>
        </ul>
      </details>
    </>
  );
};
