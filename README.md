# LoveLetters

LoveLetters is a web application that allows users to craft and send personalized, handwritten-style letters to their loved ones, blending the charm of traditional letter-writing with the convenience of digital technology.

## Features

- **Digital Handwriting**: Write letters digitally on a canvas, simulating the experience of writing on paper
- **Paper Customization**: Choose from various paper styles for your letter
- **Envelope Animation**: Letters open with a realistic animation when viewed
- **Secure Delivery**: Letters can be accessed via email links

## Tech Stack

- **Frontend**: React.js, Framer Motion, Styled Components, HTML5 Canvas
- **Backend**: Node.js, Express
- **Database**: PostgreSQL

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL

### Setting up the database

1. Create a PostgreSQL database named `loveletters`
2. Run the SQL scripts in `server/database.sql` to set up the required tables

### Setting up the server

1. Navigate to the server directory:

   ```
   cd server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on the example file:

   ```
   cp env.example .env
   ```

4. Update the `.env` file with your database credentials and JWT secret.

5. Start the server:
   ```
   npm start
   ```

### Setting up the client

1. Navigate to the client directory:

   ```
   cd client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm start
   ```

4. The application should now be running at `http://localhost:3000`

## Project Structure

- `/client` - React frontend
  - `/src/components` - Reusable UI components
  - `/src/pages` - Application pages
  - `/src/utils` - Utility functions and API calls
- `/server` - Node.js backend
  - `/database.sql` - SQL scripts for database setup
  - `/index.js` - Main server file

## Future Enhancements

- AI Handwriting Simulation
- More paper and envelope templates
- Real-time collaboration for co-creating letters
- Mobile app support

## License

MIT
