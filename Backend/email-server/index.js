import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL, // your Gmail address
    pass: process.env.PASSWORD, // your Gmail app password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

async function sendMail(to, subject, text, html) {
  try {
    // Log email attempt
    console.log("Attempting to send email to:", to);

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"Summarizer App" <${process.env.EMAIL}>`, // sender address
      to: to,
      subject: subject,
      text: text,
      html: html,
    });

    console.log("Message sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export default sendMail;
