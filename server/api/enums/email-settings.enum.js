const EmailSettingsEnum = {
  SenderName: process.env.SENDGRID_SENDER_NAME,
  SenderEmail: process.env.SENDGRID_SENDER_EMAIL,
};
module.exports = EmailSettingsEnum;
