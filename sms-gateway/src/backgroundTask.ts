import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { processDueSms } from "./gateway";
import { loadSettings } from "./settings";

export const SMS_GATEWAY_TASK = "sms-gateway-due";

TaskManager.defineTask(SMS_GATEWAY_TASK, async () => {
  try {
    const settings = await loadSettings();
    if (!settings.autoSend) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    await processDueSms();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[sms-gateway] background task failed", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function setBackgroundPolling(enabled: boolean): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(SMS_GATEWAY_TASK);
  if (enabled && !registered) {
    await BackgroundTask.registerTaskAsync(SMS_GATEWAY_TASK, {
      minimumInterval: 15,
    });
    return;
  }
  if (!enabled && registered) {
    await BackgroundTask.unregisterTaskAsync(SMS_GATEWAY_TASK);
  }
}
