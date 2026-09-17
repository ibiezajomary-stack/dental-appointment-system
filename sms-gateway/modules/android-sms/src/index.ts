import { requireOptionalNativeModule } from "expo";

type AndroidSmsNative = {
  send(phone: string, message: string): Promise<boolean>;
};

const native = requireOptionalNativeModule<AndroidSmsNative>("AndroidSms");

export function isNativeSmsAvailable(): boolean {
  return native != null;
}

export async function sendNativeSms(phone: string, message: string): Promise<void> {
  if (!native) {
    throw new Error("Silent SMS requires a development build (not Expo Go). Run: npx expo run:android");
  }
  await native.send(phone, message);
}
