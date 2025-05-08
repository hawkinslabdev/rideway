// scripts/reset-password.js
const http = require('http');

const args = process.argv.slice(2);
const action = args[0]?.toLowerCase();
const param1 = args[1]; // email or token
const param2 = args[2]; // new password (if resetting)

if (!action || !['generate', 'reset'].includes(action) || !param1) {
  console.log('Usage:');
  console.log('  node reset-password.js generate <email>');
  console.log('  node reset-password.js reset <token> <new_password>');
  process.exit(1);
}

// Function to call our API with better debugging
function callApi(data) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to API endpoint: http://localhost:3000/api/admin/reset-password`);
    console.log(`Request data: ${JSON.stringify(data)}`);
    
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/reset-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log(`API response status: ${res.statusCode} ${res.statusMessage}`);
      
      let responseData = '';
      res.on('data', (chunk) => { 
        responseData += chunk; 
      });
      
      res.on('end', () => {
        console.log(`Raw API response: ${responseData}`);
        
        try {
          const response = JSON.parse(responseData);
          console.log(`Parsed JSON response: ${JSON.stringify(response)}`);
          
          if (res.statusCode >= 400) {
            reject(new Error(response.error || 'API request failed'));
          } else {
            resolve(response);
          }
        } catch (e) {
          console.error(`JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`);
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Connection error: ${error.message}`);
      reject(new Error(`API connection error: ${error.message}. Make sure your Next.js server is running with 'npm run dev'.`));
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    if (action === 'generate') {
      console.log(`Generating reset token for email: ${param1}...`);
      const result = await callApi({ action: 'generate', email: param1 });
      
      if (result && typeof result === 'object' && 'token' in result) {
        console.log('\n---------------------------------------------');
        console.log(`Password reset token for ${param1}:`);
        console.log(result.token);
        console.log('Valid for 24 hours');
        console.log('---------------------------------------------\n');
        
        console.log('To reset the password, run:');
        console.log(`node reset-password.js reset ${result.token} your_new_password`);
        
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        console.log('\nOr share this link with the user:');
        console.log(`${baseUrl}/auth/reset-password/${result.token}`);
      } else {
        console.error('Invalid response format from server');
      }
    } 
    else if (action === 'reset') {
      if (!param2) {
        console.error('Error: New password is required');
        process.exit(1);
      }
      
      console.log(`Resetting password using token: ${param1}...`);
      const result = await callApi({ action: 'reset', token: param1, password: param2 });
      
      if (result && typeof result === 'object' && 'email' in result) {
        console.log('\n---------------------------------------------');
        console.log(`Password for ${result.email} has been reset successfully!`);
        console.log('---------------------------------------------\n');
      } else {
        console.error('Invalid response format from server');
      }
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main();