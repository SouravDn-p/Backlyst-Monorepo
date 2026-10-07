import { UserSession } from "../user";

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
  };
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface DashboardStaticsResponse {
  success: boolean;
  message: string;
  data: {
    lastPasswordChangeTime: string | null;
    registrationTime: string;
    sessions: UserSession[];
  };
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyForgotPasswordOTPResponse {
  success: boolean;
  message: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface ResendRegisterOTPResponse {
  success: boolean;
  message: string;
}




export interface SessionsResponse {
  success: boolean;
  message: string;
  data: {
    activeSessions: UserSession[];
    previousSessions: UserSession[];
  };
}

export interface DeleteSessionResponse {
  success: boolean;
  message: string;
}