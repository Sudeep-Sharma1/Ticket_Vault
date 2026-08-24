import QRCode from 'qrcode';

export interface TicketQRPayload {
  ref: string;
  eventId: string;
  eventTitle: string;
  seats: string[];
  customerEmail: string;
  issuedAt: string;
}

export const generateTicketQRCode = async (
  payload: TicketQRPayload
): Promise<{ qrDataString: string; qrDataUrl: string }> => {
  const qrDataString = JSON.stringify(payload);
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
