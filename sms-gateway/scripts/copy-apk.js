const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
const dest = path.join(root, "iSmile-sms-gateway-preview.apk");

if (!fs.existsSync(src)) {
  console.error("Release APK not found:", src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
console.log(`Copied preview APK (${mb} MB) to ${dest}`);
