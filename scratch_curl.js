const http = require('http');

const data = JSON.stringify({
  phone_number: '8676848305',
  otp: '000000'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/verify-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => { console.log('Response:', body); });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
