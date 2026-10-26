import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, cancelTicket, errorMessage, getTicket, type Ticket } from './api';
import { colors } from './theme';

const REFRESH_INTERVAL_MS = 12_000;

interface Props {
  ticketId: string;
  initialTicket: Ticket;
  onLeave: () => void;
}

export function WaitingRoomScreen({ ticketId, initialTicket, onLeave }: Props) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const currentTicket = useRef(initialTicket);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [ticketMissing, setTicketMissing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (ticket.status !== 'waiting' || ticketMissing) return;

    let active = true;
    let nextRefresh: ReturnType<typeof setTimeout> | undefined;
    let requestController: AbortController | undefined;

    async function refresh() {
      requestController = new AbortController();
      setRefreshing(true);

      try {
        const updated = await getTicket(ticketId, requestController.signal);
        if (!active) return;
        currentTicket.current = updated;
        setTicket(updated);
        setError(null);
        if (updated.status !== 'waiting') setCancelError(null);
        if (updated.status === 'waiting') {
          nextRefresh = setTimeout(() => void refresh(), REFRESH_INTERVAL_MS);
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 404) {
          setError(null);
          setCancelError(null);
          setTicketMissing(true);
          return;
        }
        setError(errorMessage(requestError));
        nextRefresh = setTimeout(() => void refresh(), REFRESH_INTERVAL_MS);
      } finally {
        if (active) setRefreshing(false);
      }
    }

    void refresh();

    return () => {
      active = false;
      if (nextRefresh) clearTimeout(nextRefresh);
      requestController?.abort();
    };
  }, [ticketId, reloadKey, ticket.status, ticketMissing]);

  async function confirmLeave() {
    setLeaving(true);
    setError(null);
    setCancelError(null);
    try {
      await cancelTicket(ticketId);
      onLeave();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        onLeave();
        return;
      }
      if (requestError instanceof ApiError && requestError.status === 409) {
        if (currentTicket.current.status !== 'waiting') {
          setError(null);
          setCancelError(null);
          setLeaving(false);
          return;
        }
        try {
          const updated = await getTicket(ticketId);
          currentTicket.current = updated;
          setTicket(updated);
          setError(null);
          setCancelError(null);
        } catch (statusError) {
          if (currentTicket.current.status !== 'waiting') {
            setError(null);
            setCancelError(null);
          } else {
            setError(errorMessage(statusError));
            setReloadKey((key) => key + 1);
          }
        } finally {
          setLeaving(false);
        }
        return;
      }
      setCancelError(
        requestError instanceof ApiError && requestError.status === undefined
          ? 'Impossible d’annuler le ticket tant que le serveur est inaccessible. Réessayez quand il sera disponible.'
          : errorMessage(requestError),
      );
      if (requestError instanceof ApiError && requestError.status !== undefined) {
        setReloadKey((key) => key + 1);
      }
      setLeaving(false);
    }
  }

  function askToLeave() {
    Alert.alert('Quitter la file ?', 'Votre ticket sera annulé.', [
      { text: 'Rester', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => void confirmLeave() },
    ]);
  }

  const waiting = ticket.status === 'waiting' && !ticketMissing;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>TESSAN · SALLE D’ATTENTE</Text>
        <Text style={styles.title}>
          {ticketMissing
            ? 'Ticket introuvable'
            : waiting
              ? 'Vous êtes dans la file'
              : ticket.status === 'called'
                ? 'C’est votre tour !'
                : 'Ticket annulé'}
        </Text>

        {waiting ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Votre position</Text>
            <Text style={styles.position}>{ticket.position}</Text>
            <Text style={styles.wait}>
              Attente estimée : {ticket.estimatedWaitMinutes} min
            </Text>
            <Text style={styles.hint}>La position est actualisée automatiquement.</Text>
          </View>
        ) : (
          <View style={styles.calledCard}>
            <Text style={styles.calledText}>
              {ticketMissing
                ? 'La file a été réinitialisée. Choisissez un motif pour créer un nouveau ticket.'
                : ticket.status === 'called'
                  ? 'Un médecin est disponible pour vous.'
                  : 'Votre ticket a été annulé.'}
            </Text>
          </View>
        )}

        {waiting && refreshing ? (
          <View style={styles.refreshRow}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.refreshText}>Actualisation…</Text>
          </View>
        ) : null}

        {cancelError || error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{cancelError ?? error}</Text>
            <Pressable
              onPress={
                cancelError
                  ? () => void confirmLeave()
                  : () => setReloadKey((key) => key + 1)
              }
              accessibilityRole="button"
            >
              <Text style={styles.retry}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        {waiting ? (
          <Pressable
            onPress={askToLeave}
            disabled={leaving}
            accessibilityRole="button"
            accessibilityState={{ disabled: leaving }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {leaving ? 'Annulation…' : 'Quitter la file'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={onLeave} accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retour aux motifs</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: colors.darkGreen, fontSize: 32, fontWeight: '700', marginTop: 16, marginBottom: 28 },
  card: { backgroundColor: colors.lightGreen, borderRadius: 18, padding: 28, alignItems: 'center' },
  cardLabel: { color: colors.darkGreen, fontSize: 16, fontWeight: '600' },
  position: { color: colors.darkGreen, fontSize: 88, fontWeight: '700', lineHeight: 108 },
  wait: { color: colors.darkGreen, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 14, marginTop: 16, textAlign: 'center' },
  calledCard: { backgroundColor: colors.lightGreen, borderRadius: 18, padding: 28 },
  calledText: { color: colors.darkGreen, fontSize: 21, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  refreshText: { color: colors.muted, marginLeft: 8 },
  errorBox: { backgroundColor: '#FFF1F0', borderRadius: 12, padding: 16, marginTop: 22 },
  errorText: { color: colors.error, lineHeight: 21 },
  retry: { color: colors.green, fontWeight: '700', marginTop: 10 },
  secondaryButton: { borderColor: colors.green, borderWidth: 1, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 30 },
  secondaryButtonText: { color: colors.green, fontSize: 17, fontWeight: '700' },
  primaryButton: { backgroundColor: colors.green, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 30 },
  primaryButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
});
