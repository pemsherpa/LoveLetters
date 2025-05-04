const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a test account at Ethereal for testing when no credentials
async function createTestAccount() {
  const testAccount = await nodemailer.createTestAccount();
  console.log('Created test account:', testAccount.user);
  console.log('Test account password:', testAccount.pass);
  console.log('Preview URL format: https://ethereal.email/message/ID');
  return testAccount;
}

// Get email transport based on environment
async function getTransport() {
  // Check if we have valid Gmail credentials
  if (process.env.EMAIL_USER && 
      process.env.EMAIL_USER !== 'your_email@gmail.com' && 
      process.env.EMAIL_PASS && 
      process.env.EMAIL_PASS !== 'your_app_password_here') {
    
    console.log('Using Gmail transport with configured credentials');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true
    });
  } else {
    // Fallback to Ethereal email (test email service) for development
    console.log('Using Ethereal test email account (emails will not be delivered)');
    const testAccount = await createTestAccount();
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
}

// Send email function
async function sendEmail(to, subject, htmlContent, attachments = []) {
  try {
    const transporter = await getTransport();
    
    const mailOptions = {
      from: `"LoveLetters" <${process.env.EMAIL_USER || 'noreply@loveletters.com'}>`,
      to,
      subject,
      html: htmlContent,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (info.messageId) {
      // For Ethereal test emails, provide the preview URL
      if (info.messageUrl) {
        console.log('Preview URL:', info.messageUrl);
        return {
          success: true,
          messageId: info.messageId,
          previewUrl: info.messageUrl
        };
      }
      
      return {
        success: true,
        messageId: info.messageId
      };
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendEmail
}; 