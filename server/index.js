const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { sendEmail } = require('./emailService');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Connected to the database');
    done();
  }
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    
    // Create JWT
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    
    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Letter Routes
app.post('/api/letters', async (req, res) => {
  try {
    const { sender_id, content, style, paper_type } = req.body;
    
    const newLetter = await pool.query(
      'INSERT INTO letters (sender_id, content, style, paper_type, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [sender_id, content, style, paper_type]
    );
    
    res.status(201).json(newLetter.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/letters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const letter = await pool.query('SELECT * FROM letters WHERE id = $1', [id]);
    
    if (letter.rows.length === 0) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    
    res.json(letter.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/:userId/letters', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const letters = await pool.query('SELECT * FROM letters WHERE sender_id = $1 ORDER BY created_at DESC', [userId]);
    
    res.json(letters.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a letter
app.delete('/api/letters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if letter exists
    const letterCheck = await pool.query('SELECT * FROM letters WHERE id = $1', [id]);
    
    if (letterCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    
    // Delete letter
    await pool.query('DELETE FROM letters WHERE id = $1', [id]);
    
    res.json({ message: 'Letter deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update letter name/title
app.patch('/api/letters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    // First check if letter exists
    const letterCheck = await pool.query('SELECT * FROM letters WHERE id = $1', [id]);
    
    if (letterCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    
    // Update letter title
    // First, add title column if it doesn't exist
    try {
      await pool.query('ALTER TABLE letters ADD COLUMN IF NOT EXISTS title VARCHAR(255)');
    } catch (err) {
      console.log('Title column already exists or error adding it:', err);
    }
    
    // Now update the title
    const updatedLetter = await pool.query(
      'UPDATE letters SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [title, id]
    );
    
    res.json(updatedLetter.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send letter via email
app.post('/api/letters/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName } = req.body;
    
    // Check if letter exists and get its content
    const letterCheck = await pool.query('SELECT * FROM letters WHERE id = $1', [id]);
    
    if (letterCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    
    const letter = letterCheck.rows[0];
    console.log(`Attempting to send email to ${recipientName} (${recipientEmail})`);
    
    // Create attachments array for email
    const attachments = [];
    
    // Prepare HTML content - simplified version
    let letterContent = '';
    
    // Check if letter content is an image
    if (letter.content && letter.content.startsWith('data:image')) {
      // Add the image as an attachment
      const imageName = `letter-${id}.png`;
      const base64Data = letter.content.split(';base64,').pop();
      
      // Add as attachment
      attachments.push({
        filename: imageName,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'image/png',
        cid: 'letter-image' // Content ID for referencing in HTML
      });
      
      // Reference it in the HTML
      letterContent = `
        <div style="text-align: center; margin: 30px 0;">
          <img src="cid:letter-image" alt="Your Love Letter" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        </div>
      `;
    } else {
      // For text content, create a simple styled div
      letterContent = `
        <div style="padding: 20px; background-color: ${getPaperColor(letter.paper_type)}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; font-family: ${getFont(letter.style)};">
          <p style="line-height: 1.6; color: #333;">${letter.content || 'No content available'}</p>
        </div>
      `;
    }
    
    // Simple HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>
        
        <p style="color: #555; font-size: 16px;">Someone special has sent you a love letter:</p>
        
        <div style="margin: 30px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fff;">
          ${letterContent}
          <div style="text-align: right; font-style: italic; color: #777; margin-top: 20px;">
            ${new Date(letter.created_at || Date.now()).toLocaleDateString()}
          </div>
        </div>
        
        <p style="color: #555;">With love,</p>
        <p style="color: #555; font-weight: bold;">LoveLetters</p>
      </div>
    `;
    
    // Send email using our email service
    const emailResult = await sendEmail(
      recipientEmail,
      'You received a love letter! 💌',
      htmlContent,
      attachments
    );
    
    if (emailResult.success) {
      // Update the letter with the recipient's email
      const updatedLetter = await pool.query(
        'UPDATE letters SET recipient_email = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [recipientEmail, id]
      );
      
      // If using Ethereal and preview URL is available
      if (emailResult.previewUrl) {
        console.log('Email preview available at:', emailResult.previewUrl);
      }
      
      res.json({ 
        message: 'Letter sent successfully', 
        letter: updatedLetter.rows[0],
        emailInfo: emailResult
      });
    } else {
      console.error('Failed to send email:', emailResult.error);
      res.status(500).json({ 
        message: 'Failed to send email', 
        error: emailResult.error,
        details: 'Email service encountered an error'
      });
    }
  } catch (error) {
    console.error('Server error in email sending route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper functions for letter styling
function getPaperColor(paperType) {
  const colors = {
    1: '#ffffff', // Plain White
    2: '#f8f5e4', // Cream
    3: '#e8f4f8', // Light Blue
    4: '#f0e6d9', // Vintage
    5: '#f8e9ec', // Rose
    'plain': '#ffffff',
    'cream': '#f8f5e4',
    'light-blue': '#e8f4f8',
    'vintage': '#f0e6d9',
    'rose': '#f8e9ec',
  };
  
  return colors[paperType] || '#ffffff';
}

function getFont(style) {
  const fonts = {
    1: 'Georgia, serif',
    2: 'Courier New, monospace',
    3: 'Arial, sans-serif',
    4: 'Verdana, sans-serif',
    5: 'Brush Script MT, cursive',
    'elegant': 'Georgia, serif',
    'typewriter': 'Courier New, monospace',
    'modern': 'Arial, sans-serif',
    'casual': 'Verdana, sans-serif',
    'handwritten': 'Brush Script MT, cursive',
  };
  
  return fonts[style] || 'Arial, sans-serif';
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 