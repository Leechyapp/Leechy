const EmailSettingsEnum = require('../enums/email-settings.enum');

const sendGridMail = require('@sendgrid/mail');
sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

class SendGridService {
  static sendEmail(body) {
    const { userUUID, profileUUID, reasonForReporting } = body;
    const text = `
        <p>Reported by User: ${userUUID}</p>
        <p>Profile reported: ${profileUUID}</p>
        <p>Reason for reporting: ${reasonForReporting}</p>
    `;
    const mailData = {
      from: {
        name: EmailSettingsEnum.SenderName,
        email: EmailSettingsEnum.SenderEmail,
      },
      //   replyTo: email,
      to: EmailSettingsEnum.SenderEmail,
      subject: `A profile was reported (${profileUUID})`,
      content: [
        {
          type: 'text/html',
          value: text,
        },
      ],
    };
    console.log(`mailData`, mailData);
    sendGridMail.send(mailData, false, (error, result) => {
      if (error) {
        console.error(`SendGridService send error: ${error}`);
        return error;
      } else {
        const statusCode = result && result.length > 0 ? result[0]?.statusCode : null;
        console.log(`SendGridService send result (statusCode: ${statusCode})`);
        return result;
      }
    });
  }
}

module.exports = SendGridService;
