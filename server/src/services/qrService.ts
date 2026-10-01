import QRCode from 'qrcode';
import { issueVaultPass } from '../utils/ticketSignature';

export interface TicketQRPayload {
  ref: string;
  eventId: string;
  seats: string[];
}

/**
 * Issues a signed VaultPass token and renders it as a QR image.
 * qrDataString is the exact token stored on the booking; the gate scanner
 * only admits a pass whose token both verifies and matches the stored one.
 */
export const generateTicketQRCode = async (
  payload: TicketQRPayload
): Promise<{ qrDataString: string; qrDataUrl: string }> => {
  const qrDataString = issueVaultPass({
    ref: payload.ref,
    eid: payload.eventId,
    seats: payload.seats,
  });
  const qrDataUrl = await QRCode.toDataURL(qrDataString, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return { qrDataString, qrDataUrl };
};
