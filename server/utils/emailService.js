const getLogoUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (apiUrl) {
    return apiUrl.replace('/api', '') + '/public/logo.png';
  }
  return 'https://hangouts-app.com/assets/images/image01.svg';
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getEmailTemplate = (code) => {
  const logoUrl = getLogoUrl();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Hangouts</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background: linear-gradient(135deg, #D4EDFC 0%, #B8E0F7 100%); border-radius: 24px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <a href="https://hangouts-app.com" style="text-decoration: none;">
                      <img src="${logoUrl}" alt="Hangouts" width="200" style="display: block; margin: 0 auto;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: rgba(255, 255, 255, 0.9); border-radius: 16px; backdrop-filter: blur(10px);">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <h1 style="margin: 0 0 16px 0; font-size: 22px; color: #1a1a2e; font-weight: 600;">Welcome to Hangouts!</h1>
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a6a; line-height: 1.6;">
                      Thanks for joining Hangouts! In order to verify your email address, please use the code below to sign up.
                    </p>
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%); border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                      <span style="font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #6b6b8a;">
                      This code will expire in <strong>10 minutes</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #4a4a6a;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">
                Making plans with friends just got easier
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px;">
                <a href="https://hangouts-app.com" style="color: #5AACE6; text-decoration: none;">hangouts-app.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    console.log('[Email] Connector not available, falling back to env var');
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Email service not configured');
    }
    return { apiKey, fromEmail: 'noreply@hangouts-app.com' };
  }

  console.log('[Email] Fetching Resend credentials from connector...');
  
  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      console.log('[Email] Connector returned no settings, falling back to env var');
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('Email service not configured');
      }
      return { apiKey, fromEmail: 'noreply@hangouts-app.com' };
    }

    console.log('[Email] Successfully retrieved Resend credentials from connector');
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email || 'noreply@hangouts-app.com'
    };
  } catch (error) {
    console.error('[Email] Connector error, falling back to env var:', error.message);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Email service not configured');
    }
    return { apiKey, fromEmail: 'noreply@hangouts-app.com' };
  }
}

async function isResendConfigured() {
  try {
    await getResendCredentials();
    return true;
  } catch {
    return false;
  }
}

const sendVerificationEmail = async (email, code) => {
  console.log(`[Email] Attempting to send verification email to: ${email}`);
  
  let credentials;
  try {
    credentials = await getResendCredentials();
  } catch (error) {
    console.error('[Email] Failed to get Resend credentials:', error.message);
    throw new Error('Email service not configured');
  }
  
  const fromAddress = `Hangouts <${credentials.fromEmail}>`;
  
  const emailPayload = {
    from: fromAddress,
    to: [email],
    subject: 'Verify your email - Hangouts',
    html: getEmailTemplate(code),
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('[Email] Resend API error:', JSON.stringify(responseData, null, 2));
      console.error('[Email] Response status:', response.status);
      throw new Error(`Failed to send verification email: ${responseData.message || response.status}`);
    }

    console.log('[Email] Successfully sent verification email, ID:', responseData.id);
    return responseData;
  } catch (error) {
    console.error('[Email] Error sending email:', error.message);
    throw error;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  isResendConfigured,
};
