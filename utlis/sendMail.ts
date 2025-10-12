require('dotenv').config();
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import ejs from 'ejs';
import path from 'path';

interface EmailOptions {
    email: string;
    subject: string;
    template: string;
    data: { [key: string]: any };
}

const sendMail = async (options: EmailOptions): Promise<void> => {
    const { email, subject, template, data } = options;

    // Render the email template with EJS
    const templatePath = path.join(__dirname, "../mails", template);
    const html: string = await ejs.renderFile(templatePath, data);

    // Initialize MailerSend
    const mailersend = new MailerSend({
        apiKey: process.env.MAILERSEND_API_KEY as string,
    });

    // Define sender and recipient
    const sentFrom = new Sender(
        process.env.MAILERSEND_FROM_EMAIL as string,
        process.env.MAILERSEND_FROM_NAME || "No Name"
    );

    const recipients = [new Recipient(email)];

    // Define email parameters
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html);

    // Send the email
    await mailersend.email.send(emailParams);
};

export default sendMail;
