import nodemailer from 'nodemailer';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT || 587,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  } else {
    // Development / Test transporter
    const testAccount = await nodemailer.createTestAccount().catch(() => null);
    if (testAccount) {
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      // Fallback in-memory mock transporter
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return transporter;
};

export const emailService = {
  sendBookingConfirmation: async (data: {
    recipientEmail: string;
    customerName: string;
    bookingReference: string;
    eventTitle: string;
    showTime: Date;
    venueName: string;
    seats: string[];
    totalAmount: number;
    qrCodeImage: string;
  }) => {
    const formattedDate = new Date(data.showTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `🎟️ Booking Confirmed: ${data.eventTitle} (${data.bookingReference})`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
        <div style="border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 26px;">Ticket Confirmation</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">Thank you for booking with us, ${data.customerName}!</p>
        </div>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #f1f5f9; margin: 0 0 10px 0; font-size: 20px;">${data.eventTitle}</h2>
          <p style="margin: 4px 0; color: #cbd5e1;">📍 <strong>Venue:</strong> ${data.venueName}</p>
          <p style="margin: 4px 0; color: #cbd5e1;">🕒 <strong>Time:</strong> ${formattedDate}</p>
          <p style="margin: 4px 0; color: #cbd5e1;">💺 <strong>Seats:</strong> <span style="background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${data.seats.join(', ')}</span></p>
          <p style="margin: 4px 0; color: #cbd5e1;">💳 <strong>Total Paid:</strong> $${data.totalAmount.toFixed(2)}</p>
          <p style="margin: 4px 0; color: #38bdf8; font-family: monospace; font-size: 16px;">🔑 <strong>Reference:</strong> ${data.bookingReference}</p>
        </div>

        <div style="text-align: center; background: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0f172a; margin: 0 0 10px;">Your Digital Admission QR Pass</h3>
          <img src="${data.qrCodeImage}" alt="QR Ticket" style="width: 220px; height: 220px; display: inline-block; border-radius: 6px;" />
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0;">Present this QR code at the entrance for direct scan & check-in.</p>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 12px;">
          <p>Ticket Booking Platform • High Demand & Instant Allocation System</p>
        </div>
      </div>
    `;

    let previewUrl: string | undefined = undefined;
    try {
      const mailer = await getTransporter();
      const info = await mailer.sendMail({
        from: ENV.SMTP_FROM,
        to: data.recipientEmail,
        subject,
        html: htmlContent,
      });
      const ethUrl = nodemailer.getTestMessageUrl(info);
      if (ethUrl) previewUrl = ethUrl.toString();
    } catch (err) {
      console.warn('[Email Warning] Could not send via SMTP transport, saving to local outbox log:', err);
    }

    // Persist to database outbox log for in-app viewing & automated validation
    await prisma.emailLog.create({
      data: {
        recipientEmail: data.recipientEmail,
        subject,
        type: 'BOOKING_CONFIRMATION',
        previewUrl,
        htmlContent,
      },
    });

    console.log(`[Email Sent] Booking Confirmation -> ${data.recipientEmail} (${data.bookingReference})`);
  },

  sendWaitlistOffer: async (data: {
    recipientEmail: string;
    customerName: string;
    eventTitle: string;
    category: string;
    seatLabel: string;
    offerToken: string;
    expiresAt: Date;
  }) => {
    const claimUrl = `${ENV.CLIENT_URL}/waitlist/claim/${data.offerToken}`;
    const formattedExpiry = new Date(data.expiresAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const subject = `⚡ URGENT: A Seat is Available for ${data.eventTitle}!`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
        <div style="border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: #10b981; margin: 0; font-size: 26px;">🎉 Waitlist Match Found!</h1>
          <p style="color: #94a3b8; margin: 4px 0 0;">Hello ${data.customerName}, your waitlist spot has opened up!</p>
        </div>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #f1f5f9; margin: 0 0 10px 0;">${data.eventTitle}</h2>
          <p style="margin: 4px 0; color: #cbd5e1;">⭐ <strong>Category:</strong> ${data.category}</p>
          <p style="margin: 4px 0; color: #cbd5e1;">💺 <strong>Reserved Seat:</strong> <strong style="color: #38bdf8;">${data.seatLabel}</strong></p>
          <p style="margin: 12px 0; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 10px; border-left: 4px solid #f59e0b; border-radius: 4px;">
            ⚠️ <strong>Time-Limited Reservation:</strong> This seat is reserved for you until <strong>${formattedExpiry}</strong>. If you do not claim it before this time, it will automatically be offered to the next waitlisted customer!
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${claimUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            🚀 Claim & Book Your Seat Now
          </a>
          <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Direct link: ${claimUrl}</p>
        </div>
      </div>
    `;

    let previewUrl: string | undefined = undefined;
    try {
      const mailer = await getTransporter();
      const info = await mailer.sendMail({
        from: ENV.SMTP_FROM,
        to: data.recipientEmail,
        subject,
        html: htmlContent,
      });
      const ethUrl = nodemailer.getTestMessageUrl(info);
      if (ethUrl) previewUrl = ethUrl.toString();
    } catch (err) {
      console.warn('[Email Warning] Could not send via SMTP transport:', err);
    }

    await prisma.emailLog.create({
      data: {
        recipientEmail: data.recipientEmail,
        subject,
        type: 'WAITLIST_OFFER',
        previewUrl,
        htmlContent,
      },
    });

    console.log(`[Email Sent] Waitlist Offer -> ${data.recipientEmail} (${claimUrl})`);
  },

  sendCancellationNotice: async (data: {
    recipientEmail: string;
    customerName: string;
    bookingReference: string;
    eventTitle: string;
    refundAmount: number;
  }) => {
    const subject = `🚫 Booking Cancelled: ${data.bookingReference}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
        <h2 style="color: #ef4444;">Booking Cancellation Confirmation</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your booking for <strong>${data.eventTitle}</strong> (Ref: <code>${data.bookingReference}</code>) has been successfully cancelled.</p>
        <p>A refund of <strong>$${data.refundAmount.toFixed(2)}</strong> has been initiated to your original payment method.</p>
        <p>Your seat has been released back into the reallocation system for waitlisted attendees.</p>
      </div>
    `;

    await prisma.emailLog.create({
      data: {
        recipientEmail: data.recipientEmail,
        subject,
        type: 'CANCELLATION_NOTICE',
        htmlContent,
      },
    });
  },
};
