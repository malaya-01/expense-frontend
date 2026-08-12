import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.finos.app",
  appName: "Opal",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  // Route XHR/fetch through native HTTP so WebView CORS cannot block the API.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
