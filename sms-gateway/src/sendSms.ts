import { PermissionsAndroid, Platform } from "react-native";
import { isNativeSmsAvailable, sendNativeSms } from "../modules/android-sms";

export { isNativeSmsAvailable };

export async function ensureSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
    title: "Allow SMS sending",
    message: "iSmile SMS Gateway sends appointment messages from this phone.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function sendSmsFromDevice(phone: string, message: string): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("SMS sending is only supported on Android");
  }
  const allowed = await ensureSmsPermission();
  if (!allowed) {
    throw new Error("SEND_SMS permission was denied");
  }
  await sendNativeSms(phone.trim(), message);
}
