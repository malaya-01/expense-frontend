import type { CapacitorConfig } from "@capacitor/cli";

// CAP_DEV=1 (e.g. `cross-env CAP_DEV=1 npx cap sync android`) re-enables
// cleartext / mixed content for local development against an http:// API.
// Release builds keep both off; see MOBILE.md.
const isDevBuild = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "com.finos.app",
  appName: "Opal",
  webDir: "out",
  server: {
    androidScheme: "https",
    ...(isDevBuild ? { cleartext: true } : {}),
  },
  android: {
    // targetSdk 35 forces edge-to-edge on Android 15+; "auto" pads the WebView
    // with the system bar insets there (unless the theme opts out).
    adjustMarginsForEdgeToEdge: "auto",
    ...(isDevBuild ? { allowMixedContent: true } : {}),
  },
  // Route XHR/fetch through native HTTP so WebView CORS cannot block the API.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
