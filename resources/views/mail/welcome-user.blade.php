<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to EthioSME</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f4f7f5; margin: 0; padding: 40px 20px; color: #0f1a16; }
    .card { background: #ffffff; border-radius: 16px; max-width: 520px;
            margin: 0 auto; padding: 40px; border: 1px solid #d1e8df; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-text { font-size: 20px; font-weight: 700; color: #085041; }
    .logo-dot { color: #5dcaa5; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #0f1a16; }
    .subtitle { color: #4b7a64; font-size: 14px; margin: 0 0 32px; }
    .role-badge { display: inline-block; padding: 4px 12px; border-radius: 20px;
                  background: #085041; color: #5dcaa5; font-size: 12px;
                  font-weight: 600; text-transform: uppercase;
                  letter-spacing: 0.05em; margin-bottom: 24px; }
    .credentials { background: #f0f7f4; border-radius: 12px;
                   border: 1px solid #d1e8df; padding: 24px; margin: 24px 0; }
    .cred-label { font-size: 11px; font-weight: 600; text-transform: uppercase;
                  letter-spacing: 0.08em; color: #4b7a64; margin-bottom: 4px; }
    .cred-value { font-size: 15px; font-weight: 600; color: #0f1a16;
                  font-family: 'Courier New', monospace;
                  background: #ffffff; border: 1px solid #d1e8df;
                  border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .btn { display: block; text-align: center; background: #085041;
           color: #ffffff; text-decoration: none; padding: 14px 24px;
           border-radius: 12px; font-weight: 600; font-size: 15px;
           margin: 28px 0; }
    .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px;
               padding: 14px; font-size: 13px; color: #92400e; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #6ebf9a; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span class="logo-text">EthioSME<span class="logo-dot">.</span></span>
    </div>

    <h1>Welcome, {{ $name }}!</h1>
    <p class="subtitle">
      Your account has been created on the EthioSME Valuation System.
    </p>

    <span class="role-badge">{{ $roleLabel }}</span>

    <div class="credentials">
      <div class="cred-label">Email Address</div>
      <div class="cred-value">{{ $email }}</div>

      <div class="cred-label">Temporary Password</div>
      <div class="cred-value">{{ $password }}</div>
    </div>

    <a href="{{ $loginUrl }}" class="btn">
      Log In to EthioSME →
    </a>

    <div class="warning">
      <strong>Security notice:</strong> Please change your password immediately
      after your first login. Do not share these credentials with anyone.
    </div>

    <div class="footer">
      EthioSME Valuation System · Addis Ababa, Ethiopia<br>
      This email was sent by your system administrator.
    </div>
  </div>
</body>
</html>
