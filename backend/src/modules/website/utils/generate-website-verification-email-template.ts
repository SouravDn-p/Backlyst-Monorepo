export function generateWebsiteVerificationEmailTemplate(websiteUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">Website Verified</h2>
      <p>Your website has been verified successfully.</p>
      <p>
        <strong>Website:</strong>
        <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${websiteUrl}</a>
      </p>
      <p>You can now continue using the platform with this verified website.</p>
    </div>
  `;
}
