export function bookingConfirmationTemplate(params: {
  barberName: string;
  customerName: string;
  date: string;
  service: string;
  manageUrl: string;
}) {
  const { barberName, customerName, date, service, manageUrl } = params;
  return `
  <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;padding:24px">
    <h2 style="margin:0 0 12px">Your booking is confirmed</h2>
    <p>Hi ${customerName},</p>
    <p>Your appointment with <strong>${barberName}</strong> is scheduled for <strong>${date}</strong> for <strong>${service}</strong>.</p>
    <p><a href="${manageUrl}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px">Manage booking</a></p>
    <p style="color:#6b7280;font-size:14px">If you did not request this, please ignore.</p>
  </div>`;
}

export function bookingReminderTemplate(params: {
  customerName: string;
  date: string;
  manageUrl: string;
}) {
  const { customerName, date, manageUrl } = params;
  return `
  <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;padding:24px">
    <h2 style="margin:0 0 12px">Reminder: upcoming appointment</h2>
    <p>Hi ${customerName}, this is a reminder for <strong>${date}</strong>.</p>
    <p><a href="${manageUrl}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px">Manage booking</a></p>
  </div>`;
}

export function barberBookingNotificationTemplate(params: {
  barberName: string;
  customerName: string;
  date: string;
  service: string;
  amount: string;
  manageUrl: string;
}) {
  const { barberName, customerName, date, service, amount, manageUrl } = params;
  return `
  <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;padding:24px">
    <h2 style="margin:0 0 12px">New booking request</h2>
    <p>Hi ${barberName},</p>
    <p>You have a new booking request from <strong>${customerName}</strong> for <strong>${service}</strong> on <strong>${date}</strong>.</p>
    <p>Amount: <strong>${amount}</strong></p>
    <p><a href="${manageUrl}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px">Manage booking</a></p>
    <p style="color:#6b7280;font-size:14px">Please confirm or cancel this booking in your dashboard.</p>
  </div>`;
}

export function welcomeEmailTemplate(params: {
  name: string;
  userType: 'client' | 'barber';
  dashboardUrl: string;
}) {
  const { name, userType, dashboardUrl } = params;
  return `
  <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;padding:24px">
    <h2 style="margin:0 0 12px">Welcome to Kutable!</h2>
    <p>Hi ${name},</p>
    <p>Welcome to Kutable, the modern barber booking platform. Your ${userType} account is now ready.</p>
    ${userType === 'barber' ? 
      '<p>You can now start setting up your profile, adding services, and accepting online bookings.</p>' :
      '<p>You can now start booking appointments with verified barbers in your area.</p>'
    }
    <p><a href="${dashboardUrl}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px">Get started</a></p>
    <p style="color:#6b7280;font-size:14px">Need help? Visit our support page or reply to this email.</p>
  </div>`;
}

export function paymentReceiptTemplate(params: {
  customerName: string;
  barberName: string;
  service: string;
  date: string;
  amount: string;
  receiptUrl: string;
}) {
  const { customerName, barberName, service, date, amount, receiptUrl } = params;
  return `
  <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;padding:24px">
    <h2 style="margin:0 0 12px">Payment receipt</h2>
    <p>Hi ${customerName},</p>
    <p>Thank you for your payment. Here are the details of your booking:</p>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Barber:</strong> ${barberName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Amount:</strong> ${amount}</p>
    </div>
    <p><a href="${receiptUrl}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px">View receipt</a></p>
    <p style="color:#6b7280;font-size:14px">Keep this email for your records.</p>
  </div>`;
}