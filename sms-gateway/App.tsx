import { StatusBar } from "expo-status-bar";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchPendingSchedules, type SmsSchedule } from "./src/api";
import { setBackgroundPolling } from "./src/backgroundTask";
import { processDueSms } from "./src/gateway";
import { isNativeSmsAvailable } from "./src/sendSms";
import {
  loadLastRun,
  loadSettings,
  saveSettings,
  type GatewaySettings,
  type LastRun,
} from "./src/settings";

const POLL_MS = 45_000;

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  } catch {
    return iso;
  }
}

export default function App() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SmsSchedule[]>([]);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [status, setStatus] = useState("Load settings, then send due SMS.");
  const settingsRef = useRef<GatewaySettings>({ apiBaseUrl: "", secret: "", autoSend: false });

  const persist = useCallback(async (next: GatewaySettings) => {
    settingsRef.current = next;
    await saveSettings(next);
    await setBackgroundPolling(next.autoSend);
    if (next.autoSend) {
      await activateKeepAwakeAsync("sms-gateway");
    } else {
      await deactivateKeepAwake("sms-gateway");
    }
  }, []);

  const refreshPending = useCallback(async (settings?: GatewaySettings) => {
    const current = settings ?? settingsRef.current;
    if (!current.apiBaseUrl || !current.secret) {
      setPending([]);
      return;
    }
    const rows = await fetchPendingSchedules(current);
    setPending(rows);
  }, []);

  const sendDue = useCallback(async () => {
    setBusy(true);
    try {
      await persist({
        apiBaseUrl: url.trim(),
        secret: secret.trim(),
        autoSend,
      });
      const run = await processDueSms();
      setLastRun(run);
      setStatus(
        run.due === 0
          ? "No due SMS right now."
          : `Sent ${run.sent}, failed ${run.failed} of ${run.due} due.`,
      );
      await refreshPending();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      Alert.alert("SMS gateway", message);
    } finally {
      setBusy(false);
    }
  }, [autoSend, persist, refreshPending, secret, url]);

  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      settingsRef.current = settings;
      setUrl(settings.apiBaseUrl);
      setSecret(settings.secret);
      setAutoSend(settings.autoSend);
      setLastRun(await loadLastRun());
      await setBackgroundPolling(settings.autoSend);
      if (settings.autoSend) {
        await activateKeepAwakeAsync("sms-gateway");
      }
      try {
        await refreshPending(settings);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
      setReady(true);
    })();
  }, [refreshPending]);

  useEffect(() => {
    if (!autoSend || !ready) return;
    const timer = setInterval(() => {
      void sendDue();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [autoSend, ready, sendDue]);

  const toggleAutoSend = async (value: boolean) => {
    setAutoSend(value);
    await persist({
      apiBaseUrl: url.trim(),
      secret: secret.trim(),
      autoSend: value,
    });
    if (value) {
      void sendDue();
    }
  };

  const saveOnly = async () => {
    setBusy(true);
    try {
      await persist({
        apiBaseUrl: url.trim(),
        secret: secret.trim(),
        autoSend,
      });
      await refreshPending({
        apiBaseUrl: url.trim(),
        secret: secret.trim(),
        autoSend,
      });
      setStatus("Settings saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      Alert.alert("SMS gateway", message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0F766E" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.kicker}>RHU Calinog</Text>
        <Text style={styles.title}>iSmile SMS Gateway</Text>
        <Text style={styles.subtitle}>
          {isNativeSmsAvailable()
            ? "Sends appointment SMS from this phone"
            : "Needs a development build — Expo Go cannot send silent SMS"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => {
              void refreshPending().catch((error) => {
                setStatus(error instanceof Error ? error.message : String(error));
              });
            }}
            tintColor="#0F766E"
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Server</Text>
          <Text style={styles.label}>API URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://your-app.onrender.com"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <Text style={styles.label}>Gateway secret</Text>
          <TextInput
            value={secret}
            onChangeText={setSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="SMS_GATEWAY_SECRET"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
          <Pressable style={styles.secondaryButton} onPress={() => void saveOnly()} disabled={busy}>
            <Text style={styles.secondaryButtonText}>Save and load queue</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Auto-send</Text>
              <Text style={styles.hint}>Polls every 45s while open, and about every 15 min in the background.</Text>
            </View>
            <Switch
              value={autoSend}
              onValueChange={(value) => void toggleAutoSend(value)}
              trackColor={{ false: "#CBD5E1", true: "#5EEAD4" }}
              thumbColor={autoSend ? "#0F766E" : "#F8FAFC"}
            />
          </View>
          <Pressable style={styles.primaryButton} onPress={() => void sendDue()} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#ECFDF5" />
            ) : (
              <Text style={styles.primaryButtonText}>Send due SMS now</Text>
            )}
          </Pressable>
          <Text style={styles.status}>{status}</Text>
          {lastRun ? (
            <Text style={styles.hint}>
              Last run {formatWhen(lastRun.at)} — sent {lastRun.sent}, failed {lastRun.failed}, due {lastRun.due}
              {lastRun.error ? `\n${lastRun.error}` : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Queue ({pending.length})</Text>
          {pending.length === 0 ? (
            <Text style={styles.hint}>No unsent schedules. Confirm an appointment to queue SMS.</Text>
          ) : (
            pending.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemKind}>{item.kind === "CONFIRMATION" ? "Accepted" : "Day-before reminder"}</Text>
                <Text style={styles.itemPhone}>{item.phone}</Text>
                <Text style={styles.itemWhen}>{formatWhen(item.scheduledAt)}</Text>
                <Text style={styles.itemMessage}>{item.message}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0F766E",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  kicker: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#ECFDF5",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  subtitle: {
    color: "#CCFBF1",
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#134E4A",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  hint: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ECFDF5",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0F766E",
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "700",
  },
  item: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    gap: 2,
  },
  itemKind: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  itemPhone: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  itemWhen: {
    color: "#64748B",
    fontSize: 12,
  },
  itemMessage: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
