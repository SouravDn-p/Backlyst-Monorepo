export type AdminLoginRequest = {
  email: string;
  password: string;
};

export type ForgottenPasswordRequest = {
  email: string;
};

export type VerifyForgottenPasswordOtpRequest = {
  email: string;
  otp: string;
  newPassword: string;
};

export type AdminLoginData = {
  accessToken?: string;
  token?: string;
};

export type AdminLoginResponse = {
  success?: boolean;
  message?: string;
  data?: AdminLoginData;
  accessToken?: string;
  token?: string;
};
