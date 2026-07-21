import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type User = {
  id: string;
  email: string;
  full_name: string;
};

type AuthState = {
  user: User;
  token: string;
  iat: number;
  exp: number;
};

const initialState: { value: AuthState } = {
  value: {
    user: {
      id: "",
      email: "",
      full_name: "",
    },
    token: "",
    iat: 0,
    exp: 0,
  },
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthDetails: (state, action: PayloadAction<AuthState>) => {
      state.value = action.payload;
    },
    logout: (state) => {
      state.value = initialState.value;
    },
  },
});

export const {setAuthDetails, logout} = authSlice.actions;
export default authSlice.reducer;