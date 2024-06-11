const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const readline = require('readline');
const fs = require('fs');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

const app = express();
const port = 8000;

// JWT secret key
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTcxNjA1MzA1MywiaWF0IjoxNzE2MDUzMDUzfQ.090vSKf8IQHq-J6cTeUdpqM7tIv8sDj1k1S-18H2iTM';

// Use CORS middleware
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Google Sheets API credentials
const CLIENT_ID = '1027096902490-mvjrpibfiquhq4r5l3bpa7cnhjnpsphp.apps.googleusercontent.com';
const CLIENT_SECRET = 'AIzaSyDwHw6i7IIXd8N3H-802BGL9C_Jqled4jk';
const REDIRECT_URI = 'http://localhost:8000';
const TOKEN_PATH = 'token.json';
const SPREADSHEET_ID = '1igpcnmZWxS5t8vTNZsLI9UWqZDk1QdLf9bJZHYhZc1s';

// Google Sheets API scopes
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Load client secrets from a JSON file
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.error('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API
  authorize(JSON.parse(content));
});

// Create an OAuth2 client with the given credentials
function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client);
    oAuth2Client.setCredentials(JSON.parse(token));
    app.locals.oAuth2Client = oAuth2Client; // Store the authorized client in app locals
  });
}

// Get and store new token after prompting for user authorization
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      app.locals.oAuth2Client = oAuth2Client; // Store the authorized client in app locals
    });
  });
}

// Endpoint to handle registration
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const auth = req.app.locals.oAuth2Client;

  if (!auth) {
    return res.status(500).send({ success: false, message: 'Authorization failed' });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const valueRangeBody = {
    majorDimension: 'ROWS',
    values: [
      [username, password]
    ]
  };
  sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:B',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: valueRangeBody
  }, (err, response) => {
    if (err) {
      console.error('The API returned an error:', err);
      return res.status(500).send({ success: false, message: 'Error registering user' });
    }
    console.log('User registered successfully');
    res.send({ success: true });
  });
});

// Endpoint to handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const auth = req.app.locals.oAuth2Client;

  if (!auth) {
    return res.status(500).send({ success: false, message: 'Authorization failed' });
  }

  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:B',
  }, (err, result) => {
    if (err) {
      console.error('The API returned an error:', err);
      return res.status(500).send({ success: false, message: 'Error logging in' });
    }
    const rows = result.data.values;
    if (rows.length) {
      const user = rows.find(row => row[0] === username && row[1] === password);
      if (user) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.send({ success: true, token });
      } else {
        res.status(401).send({ success: false, message: 'Invalid credentials' });
      }
    } else {
      res.status(404).send({ success: false, message: 'No users found' });
    }
  });
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ success: false, message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).send({ success: false, message: 'Failed to authenticate token' });

    req.userId = decoded.id;
    next();
  });
}

// Endpoint to handle logout
app.post('/logout', (req, res) => {
  // Invalidate the token here if you are storing tokens
  res.send({ success: true, message: 'Logged out successfully' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
