import { QRCodeSVG } from "qrcode.react";
import { Address as AddressType } from "viem";
import { Address } from "~~/components/scaffold-eth";

type AddressQRCodeModalProps = {
  address: AddressType;
  modalId: string;
};

export const AddressQRCodeModal = ({ address, modalId }: AddressQRCodeModalProps) => {
  return (
    <>
      <div>
        <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
        <label htmlFor={`${modalId}`} className="modal cursor-pointer">
          <label className="modal-box relative">
            {/* dummy input to capture event onclick on modal box */}
            <input className="h-0 w-0 absolute top-0 left-0" />
            <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
              ✕
            </label>
            <div className="space-y-4 py-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Wallet Address QR Code</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan to copy address
                </p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <QRCodeSVG value={address} size={200} />
                </div>
                <div className="text-center">
                  <Address address={address} format="long" disableAddressLink onlyEnsOrAddress />
                </div>
              </div>
            </div>
          </label>
        </label>
      </div>
    </>
  );
};
