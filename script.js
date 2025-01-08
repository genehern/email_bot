require("dotenv").config();

const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const fs = require("fs");
const csv = require("csv-parser");

// OAuth2 setup

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function createTransporter() {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.MY_EMAIL,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: accessToken.token, // Add the access token
    },
  });
}

// Path to the CSV file
const csvFilePath = process.env.CSV_FILE_PATH;

// Function to send emails with retry logic
async function sendEmail(
  transporter,
  recipientMail,
  recipientName,
  senderName,
  attempt = 1
) {
  try {
    let mailOptions = {
      from: process.env.MY_EMAIL, // Sender address
      to: recipientMail, // Recipient address
      subject:
        "Invitation for Partnership with NUS Sheares Hall, Sheares Link 24/25", // Subject line
      html: `
      <p>Dear ${recipientName},</p>
      <p>I am ${senderName}, Marketing Committee member of the Sheares Link (SL) for Sheares Hall from the National University of Singapore (NUS). This coming start of November, Sheares Hall will be hosting our annual Night Cycling to reach out to NUS Students who are currently staying in Sheares Hall. Night Cycling is an event held on two days, 1st and 8th November with an estimated participant count of over 200 students and around 30 committee members to run the event.</p>
      
      <p>Night Cycling is an overnight event where Shearites will be paired up to enjoy a scenic ride across Singapore, taking in the city's beauty under the night sky. To prepare, we are seeking sponsors to join us and make the event a huge success. We would hereby like to extend an invitation of collaboration to your company to be part of this event as a valued sponsor of Sheares Hall.</p>
      
      <p>With that being said, here are some ways your company can benefit from being a sponsor of our event:</p>
      <ol>
        <li>Increased brand exposure – Your brand will have the opportunity to reach out to over 200 participants through talks and advertisements, 30 committee members and organizers, as well as over 600 students already staying in Sheares Hall of all walks of life and from various faculties and around NUS.</li>
        <li>Social media outreach – Your brand will be published on our Sheares Link social media channels, such as Instagram and Tiktok. Some of which boast over 1000 followers and over 50k outreach. Similarly, if you would like to increase your user base for any relevant application, we will assist you in doing so.</li>
        <li>Increased brand advocacy – We will assist your brand by disseminating product samples/brand collaterals. This also includes printing of brand logos on event shirts and banners.</li>
      </ol>
      
      <p>We are keen on both cash sponsorships and product sponsorships, such as vouchers or product samples, among others. We are also keen on items that could be used as part of a goodie bag during the event. In return, it is our greatest pleasure to provide you with brand exposure and an expanded following.</p>
      
      <p>Our Sheares Link Pitchbook is attached below for more detailed information. Should there be any clarifications to be made, my team and I would gladly address them as soon as possible. We hope to hear from you soon!</p>
      
      Warmest regards,<br>
      ${senderName}<br>
      Marketing Committee Member<br>
      Sheares Link 23/24<br>
      Sheares Hall, National University of Singapore<br>
      <p style="color: blue; font-size: 11px">| 20 Heng Mui Keng Terrace, Singapore 119618</p>
      
      <p style="color: orange">Important: This email is confidential and may be privileged. If you are not the intended recipient, please delete it and notify us immediately; you should not copy or use it for any purpose, nor disclose its contents to any other person. Thank you.</p>
    `,
      attachments: [
        {
          filename: process.env.ATTACHMENT_FILE_NAME, // Name of the file as it will appear in the email
          path: process.env.ATTACHMENT_FILE_PATH, // Path to the file (relative or absolute)
        },
      ],
    };

    // Send the email
    let info = await transporter.sendMail(mailOptions);
    console.log(`Message sent to ${recipientMail}: %s`, info.messageId);
  } catch (error) {
    console.error(`Error sending email to ${recipientMail}: ${error}`);
  }
}

// Function to process CSV and send emails sequentially
async function processCSVAndSendEmails() {
  try {
    const results = [];

    // Read CSV file and store results
    fs.createReadStream(csvFilePath)
      .pipe(csv({ headers: false }))
      .on("data", (row) => {
        const recipientMail = row["1"];
        const recipientName = row["0"];
        const senderName = row["2"];

        // Validate email address
        if (!recipientMail || !/^\S+@\S+\.\S+$/.test(recipientMail)) {
          console.error(`Invalid email address: ${recipientMail}`);
          return;
        }

        results.push({ recipientMail, recipientName, senderName });
      })
      .on("end", async () => {
        console.log("CSV file read complete. Sending emails...");

        // Create the OAuth2 transporter
        const transporter = await createTransporter();

        // Send emails sequentially
        for (const { recipientMail, recipientName, senderName } of results) {
          await sendEmail(
            transporter,
            recipientMail,
            recipientName,
            senderName
          );
          await delay(30000);
        }

        console.log("All emails processed.");
      })
      .on("error", (error) => {
        console.error(`Error reading CSV file: ${error}`);
      });
  } catch (error) {
    console.error(`Error processing CSV file: ${error}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start processing CSV and sending emails
processCSVAndSendEmails();
