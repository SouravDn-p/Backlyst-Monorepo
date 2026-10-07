export const loginWithGoogle = () => {
  const baseUrl =
    process.env.VITE_API_BASE_URL || "https://backlystapi.softvenceomegaforce.cloud";

    window.location.href = `${baseUrl}/auth/google`;
};