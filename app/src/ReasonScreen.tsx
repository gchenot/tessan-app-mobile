import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, createTicket, errorMessage, getReasons, type Reason, type Ticket } from './api';
import { colors } from './theme';

interface Props {
  onJoined: (ticket: Ticket) => void;
}

export function ReasonScreen({ onJoined }: Props) {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [lockedReason, setLockedReason] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const pendingCreation = useRef<{ reason: string; requestId: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getReasons(controller.signal)
      .then((loadedReasons) => {
        if (!controller.signal.aborted) setReasons(loadedReasons);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  function retryReasons() {
    setLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }

  async function joinQueue() {
    if (
      !selectedReason ||
      joining ||
      (pendingCreation.current && pendingCreation.current.reason !== selectedReason)
    ) return;
    if (!pendingCreation.current) {
      pendingCreation.current = {
        reason: selectedReason,
        requestId: Crypto.randomUUID(),
      };
      setLockedReason(selectedReason);
    }
    setJoining(true);
    setJoinError(null);

    try {
      const ticket = await createTicket(selectedReason, pendingCreation.current.requestId);
      setJoining(false);
      onJoined(ticket);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        pendingCreation.current = null;
        setLockedReason(null);
      }
      setJoinError(errorMessage(error));
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>TESSAN · TÉLÉCONSULTATION</Text>
        <Text style={styles.title}>Pourquoi consultez-vous ?</Text>
        <Text style={styles.description}>
          Choisissez un motif pour rejoindre la salle d’attente.
        </Text>

        {loading && reasons.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={styles.info}>Chargement des motifs…</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable onPress={retryReasons} accessibilityRole="button">
              <Text style={styles.retry}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        {reasons.map((reason) => {
          const selected = selectedReason === reason.id;
          const disabled = joining || (lockedReason !== null && reason.id !== lockedReason);
          return (
            <Pressable
              key={reason.id}
              onPress={() => {
                setSelectedReason(reason.id);
                setJoinError(null);
              }}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              style={[
                styles.reason,
                selected && styles.reasonSelected,
                disabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.reasonLabel}>{reason.label}</Text>
              <Text style={styles.radio}>{selected ? '●' : '○'}</Text>
            </Pressable>
          );
        })}

        {joinError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{joinError}</Text>
            {lockedReason ? (
              <Text style={styles.info}>Ce motif reste sélectionné jusqu’à confirmation du ticket.</Text>
            ) : null}
            <Pressable onPress={() => void joinQueue()} accessibilityRole="button">
              <Text style={styles.retry}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={() => void joinQueue()}
          disabled={!selectedReason || joining || loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedReason || joining || loading }}
          style={[styles.primaryButton, (!selectedReason || joining || loading) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {joining ? 'Création du ticket…' : 'Rejoindre la file'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.darkGreen, fontSize: 32, fontWeight: '700', marginTop: 16 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12, marginBottom: 28 },
  centered: { alignItems: 'center', paddingVertical: 48 },
  info: { color: colors.muted, marginTop: 12 },
  reason: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonSelected: { backgroundColor: colors.lightGreen, borderColor: colors.green },
  reasonLabel: { color: colors.darkGreen, fontSize: 17, fontWeight: '600', flexShrink: 1 },
  radio: { color: colors.green, fontSize: 25, marginLeft: 12 },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  errorBox: { backgroundColor: '#FFF1F0', borderRadius: 12, padding: 16, marginBottom: 16 },
  errorText: { color: colors.error, lineHeight: 21 },
  retry: { color: colors.green, fontWeight: '700', marginTop: 10 },
});
