CREATE DATABASE loveletters;

-- Connect to the database
\c loveletters;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create letters table
CREATE TABLE letters (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  recipient_email VARCHAR(255),
  access_code VARCHAR(20),
  title VARCHAR(255),
  content TEXT,
  style VARCHAR(50),
  paper_type VARCHAR(50),
  is_animated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Create images table for letter attachments
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  letter_id INTEGER REFERENCES letters(id),
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create handwriting samples table
CREATE TABLE handwriting_samples (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  sample_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for storing envelope templates
CREATE TABLE envelope_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  template_url VARCHAR(255),
  is_premium BOOLEAN DEFAULT FALSE
);

-- Create table for storing paper templates
CREATE TABLE paper_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  template_url VARCHAR(255),
  is_premium BOOLEAN DEFAULT FALSE
); 