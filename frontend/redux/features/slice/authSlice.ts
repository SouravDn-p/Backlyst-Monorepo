import { UserData } from "@/types/user";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/redux/store/store";

export enum ActiveTabs {
    REQUESTER = "requester",
    PROVIDER = "provider"
}

type AuthState = {
  user: UserData | null;
  isAuthenticated: boolean;
  authStatus: "idle" | "loading" | "authenticated";
  activeTab: "requester" | "provider";
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  authStatus: "idle",
  activeTab: "requester",
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (state, action: PayloadAction<UserData>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.authStatus = "authenticated";
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authStatus = "idle";
      state.activeTab = "requester";
    },

    setLoading: (state) => {
      state.authStatus = "loading";
    },

    setActiveTab: (state, action: PayloadAction<"requester" | "provider">) => {
      state.activeTab = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading, setActiveTab } =
  authSlice.actions;

export const selectActiveTab = (state: RootState) => state.auth.activeTab;

export default authSlice.reducer;