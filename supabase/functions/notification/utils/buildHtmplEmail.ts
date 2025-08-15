export function buildHtmlEmail(subject: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
  /* Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;700&display=swap');

  body {
    margin: 0;
    padding: 0;
    font-family: 'Source Sans Pro', Arial, sans-serif;
    background-color: #f4f6f8;
    color: #333;
  }

  a {
    color: #1a82e2;
    text-decoration: none;
  }

  .email-wrapper {
    width: 100%;
    padding: 20px 0;
    background-color: #f4f6f8;
  }

  .email-content {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    overflow: hidden;
  }

  .email-header {
    background: linear-gradient(90deg, #1a82e2, #0f6fc1);
    color: #ffffff;
    padding: 30px 24px;
    text-align: center;
  }

  .email-header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }

  .email-body {
    padding: 24px;
    font-size: 16px;
    line-height: 1.6;
  }

  .email-footer {
    padding: 20px 24px;
    font-size: 14px;
    color: #666666;
    text-align: center;
    background-color: #f9fafb;
  }


  @media screen and (max-width: 600px) {
    .email-header h1 { font-size: 24px; }
    .email-body { font-size: 15px; }
  }
</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <!-- Header -->
      <div class="email-header">
        <h1>${subject}</h1>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p>${content}</p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>Best Regards,<br>WikiAdviser Team</p>
        <p>You received this email because of a notification from WikiAdviser.</p>
      </div>s
    </div>
  </div>
</body>
</html>
`;
}
