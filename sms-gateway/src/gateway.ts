import { fetchDueSchedules, markScheduleFailed, markScheduleSent } from "./api";
import { loadSettings, saveLastRun, type LastRun } from "./settings";
import { sendSmsFromDevice } from "./sendSms";

export async function processDueSms(): Promise<LastRun> {
  const settings = await loadSettings();
  const due = await fetchDueSchedules(settings);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const item of due) {
    try {
      await sendSmsFromDevice(item.phone, item.message);
      await markScheduleSent(settings, item.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      failed += 1;
      try {
        await markScheduleFailed(settings, item.id, message);
      } catch {
        // Keep going even if the server ack fails.
      }
    }
  }

  const run: LastRun = {
    at: new Date().toISOString(),
    sent,
    failed,
    due: due.length,
    error: lastError,
  };
  await saveLastRun(run);
  return run;
}
