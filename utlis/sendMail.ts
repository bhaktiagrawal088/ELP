    // import nodemailer from "nodemailer";
    // import ejs from "ejs";
    // import path from "path";
    // import dotenv from "dotenv";

    // dotenv.config();

    // interface EmailOptions {
    //   email: string;
    //   subject: string;
    //   template: string;
    //   data: { [key: string]: any };
    // }

    // const sendMail = async (options: EmailOptions): Promise<void> => {
    //   const { email, subject, template, data } = options;

    //   // SMTP transporter
    //   const transporter = nodemailer.createTransport({
    //     host: process.env.SMTP_HOST, // smtp.mailersend.com
    //     port: parseInt(process.env.SMTP_PORT || "587"),
    //     secure: false, // false for port 587 (STARTTLS)
    //     auth: {
    //       user: process.env.SMTP_MAIL,
    //       pass: process.env.SMTP_PASSWORD,
    //     },
    //   });

    //   // Path to template
    //   const templatePath = path.join(__dirname, "../mails", template);

    //   // Render HTML
    //   const html = await ejs.renderFile(templatePath, data);

    //   // Mail options
    //   const mailOptions = {
    //     from: process.env.SMTP_MAIL,
    //     to: email,
    //     subject,
    //     html,
    //   };

    //   // Send email
    //   await transporter.sendMail(mailOptions);

    //   console.log(`✅ Email sent to ${email}`);
    // };


    // export default sendMail;

    // import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
    // import ejs from "ejs";
    // import path from "path";
    // import dotenv from "dotenv";

    // dotenv.config();

    // interface EmailOptions {
    // email: string;
    // subject: string;
    // template: string;
    // data: { [key: string]: any };
    // }

    // const sendMail = async (options: EmailOptions): Promise<void> => {
    // const { email, subject, template, data } = options;

    // // Render template
    // const templatePath = path.join(__dirname, "../mails", template);
    // const html = await ejs.renderFile(templatePath, data);

    // // Initialize MailerSend with API Key
    // const mailersend = new MailerSend({
    //     apiKey: process.env.MAILERSEND_API_KEY as string,
    // });

    // const sender = new Sender(
    //     process.env.MAILERSEND_FROM_EMAIL as string,
    //     process.env.MAILERSEND_FROM_NAME || "No Name"
    // );

    // const recipients = [new Recipient(email)];

    // const emailParams = new EmailParams()
    //     .setFrom(sender)
    //     .setTo(recipients)
    //     .setSubject(subject)
    //     .setHtml(html);

    // await mailersend.email.send(emailParams);

    // console.log(`✅ Email sent to ${email}`);
    // };

    // export default sendMail;

// import nodemailer from "nodemailer";
// import ejs from "ejs";
// import path from "path";

// interface EmailOptions {
//   email: string;
//   subject: string;
//   template: string;
//   data: { [key: string]: any };
// }

// const sendMail = async (options: EmailOptions): Promise<void> => {
//   const { email, subject, template, data } = options;

//   // 1️⃣ Render EJS Template
//   const templatePath = path.join(__dirname, "../mails", template);
//   const html = await ejs.renderFile(templatePath, data);

//   // 2️⃣ Create Transporter (Mailtrap SMTP)
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     auth: {
//       user: process.env.SMTP_MAIL,
//       pass: process.env.SMTP_PASSWORD,
//     },
//   });

//   // 3️⃣ Send Email
//   await transporter.sendMail({
//     from: `"Live English With Sushil" <${process.env.FROM_EMAIL || "sushildnn78@gmail.com"}>`,
//     to: email, // ✅ send to req.body.email
//     subject,
//     html,
//   });

//   console.log(`✅ Email sent to ${email}`);
// };

// export default sendMail;

import axios from "axios";
import ejs from "ejs";
import path from "path";

const MAILTRAP_TOKEN = process.env.MAILTRAP_API_TOKEN;

interface MailOptions {
  email: string;
  subject: string;
  template: string;      // filename (e.g. activation-mail.ejs)
  data: object;          // variables to inject in EJS
  from?: string;
}

export const sendMail = async (options: MailOptions) => {
  try {
    if (!MAILTRAP_TOKEN) throw new Error("Mailtrap API token missing");

    // 1️⃣  Render EJS template to HTML
    const templatePath = path.join(__dirname, "../mails", options.template);
    const htmlContent = await ejs.renderFile(templatePath, options.data);

    // 2️⃣  Send email via Mailtrap Email API
    const response = await axios.post(
      "https://send.api.mailtrap.io/api/send",
      {
        from: {
          email: options.from || "no-reply@yourdomain.com",
          name: "Learning Platform",
        },
        to: [{ email: options.email }],
        subject: options.subject,
        html: htmlContent,
      },
      {
        headers: {
          Authorization: `Bearer ${MAILTRAP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Mail sent successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Mail sending failed:", error.response?.data || error.message);
    throw error;
  }
};
