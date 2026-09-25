const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const destDir = path.join(
  root,
  "node_modules",
  "@capgo",
  "capacitor-native-biometric",
  "android",
  "src",
  "main",
  "java",
  "ee",
  "forgr",
  "biometric",
);
const vendorDir = path.join(root, "vendor", "capgo-native-biometric");

if (!fs.existsSync(destDir) || !fs.existsSync(vendorDir)) {
  process.exit(0);
}

for (const file of ["AuthActivity.java", "NativeBiometric.java"]) {
  fs.copyFileSync(path.join(vendorDir, file), path.join(destDir, file));
}
