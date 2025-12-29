export default function PrivacyPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Privacy Policy</h1> <br />
      No Content Tracking: We do not record your prompts, chat history, or API
      keys.
      <br /> <br />
      No Cookies: This site does not use cookies for tracking. <br /> <br />
      Analytics: We use PostHog (configured in privacy-mode) solely to count
      aggregate page views and feature usage (e.g., "How many users clicked
      'Merge'"). Open Source: You can verify this configuration in our GitHub
      Repository.
    </div>
  );
}
