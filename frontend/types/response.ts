export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPaginatedResponse<T, M = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta: M;
}