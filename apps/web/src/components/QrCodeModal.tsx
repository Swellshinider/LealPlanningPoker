import { QRCodeSVG } from "qrcode.react";
import { CloseIcon } from "./icons";

export interface QrCodeModalProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

export function QrCodeModal({ url, open, onClose }: QrCodeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-label="Room QR code"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-panel__header">
          <h2>Scan to join</h2>
          <button
            className="button button--quiet button--icon"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="modal-panel__body">
          <QRCodeSVG value={url} size={200} />
          <p className="modal-panel__url">{url}</p>
        </div>
      </div>
    </div>
  );
}
