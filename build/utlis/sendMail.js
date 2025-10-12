"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const mailersend_1 = require("mailersend");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail = async (options) => {
    const { email, subject, template, data } = options;
    // Render the email template with EJS
    const templatePath = path_1.default.join(__dirname, "../mails", template);
    const html = await ejs_1.default.renderFile(templatePath, data);
    // Initialize MailerSend
    const mailersend = new mailersend_1.MailerSend({
        apiKey: process.env.MAILERSEND_API_KEY,
    });
    // Define sender and recipient
    const sentFrom = new mailersend_1.Sender(process.env.MAILERSEND_FROM_EMAIL, process.env.MAILERSEND_FROM_NAME || "No Name");
    const recipients = [new mailersend_1.Recipient(email)];
    // Define email parameters
    const emailParams = new mailersend_1.EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(subject)
        .setHtml(html);
    // Send the email
    await mailersend.email.send(emailParams);
};
exports.default = sendMail;
