import { configureStore } from "@reduxjs/toolkit";
import { listenerMiddleware } from "./listeners";
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      ui: uiReducer,
      notifications: notificationsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
