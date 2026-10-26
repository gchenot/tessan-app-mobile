import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReasonScreen } from './src/ReasonScreen';
import { WaitingRoomScreen } from './src/WaitingRoomScreen';
import { ApiError, errorMessage, getTicket, type Ticket } from './src/api';
import { colors } from './src/theme';

const ACTIVE_TICKET_ID_KEY = '@tessan/active-ticket-id';

export default function App() {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreErrorKind, setRestoreErrorKind] = useState<'storage' | 'api' | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [skipRestore, setSkipRestore] = useState(false);

  useEffect(() => {
    if (skipRestore) return;

    let active = true;

    async function restoreTicket() {
      setRestoring(true);
      setRestoreError(null);
      setRestoreErrorKind(null);

      async function clearSavedTicket(): Promise<boolean> {
        try {
          await AsyncStorage.removeItem(ACTIVE_TICKET_ID_KEY);
          return true;
        } catch (error) {
          if (active) {
            setRestoreError(errorMessage(error));
            setRestoreErrorKind('storage');
          }
          return false;
        }
      }

      try {
        let ticketId: string | null;
        try {
          ticketId = await AsyncStorage.getItem(ACTIVE_TICKET_ID_KEY);
        } catch (error) {
          if (active) {
            setRestoreError(errorMessage(error));
            setRestoreErrorKind('storage');
          }
          return;
        }

        if (!active) return;
        if (!ticketId) {
          setTicket(null);
          return;
        }

        let restoredTicket: Ticket;
        try {
          restoredTicket = await getTicket(ticketId);
        } catch (error) {
          if (!active) return;

          if (error instanceof ApiError && error.status === 404) {
            if (await clearSavedTicket()) setTicket(null);
          } else {
            setRestoreError(errorMessage(error));
            setRestoreErrorKind('api');
          }
          return;
        }

        if (!active) return;
        if (restoredTicket.status === 'cancelled') {
          if (await clearSavedTicket()) setTicket(null);
        } else {
          setTicket(restoredTicket);
        }
      } catch (error) {
        if (active) {
          setRestoreError(errorMessage(error));
          setRestoreErrorKind('storage');
        }
      } finally {
        if (active) setRestoring(false);
      }
    }

    void restoreTicket();
    return () => {
      active = false;
    };
  }, [restoreAttempt, skipRestore]);

  function continueWithoutRestore() {
    setSkipRestore(true);
    setTicket(null);
    setRestoreError(null);
    setRestoreErrorKind(null);
    setRestoring(false);
  }

  async function handleJoined(newTicket: Ticket) {
    try {
      await AsyncStorage.setItem(ACTIVE_TICKET_ID_KEY, newTicket.id);
    } catch {
      Alert.alert(
        'Ticket créé',
        'La sauvegarde locale a échoué. Le ticket ne sera pas restauré si vous fermez l’app.',
      );
    }
    setTicket(newTicket);
  }

  async function handleLeave() {
    try {
      await AsyncStorage.removeItem(ACTIVE_TICKET_ID_KEY);
    } catch {
      Alert.alert(
        'Ticket terminé',
        'La suppression locale a échoué. L’app vérifiera le ticket à sa prochaine ouverture.',
      );
    }
    setTicket(null);
  }

  return (
    <SafeAreaProvider>
      {restoring ? (
        <View style={styles.messageScreen}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.message}>Vérification de votre ticket…</Text>
        </View>
      ) : restoreError ? (
        <View style={styles.messageScreen}>
          <Text style={styles.error}>{restoreError}</Text>
          <Pressable
            onPress={() => setRestoreAttempt((attempt) => attempt + 1)}
            accessibilityRole="button"
            style={styles.button}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
          {restoreErrorKind === 'storage' ? (
            <>
              <Text style={styles.warning}>
                Un ancien ticket pourrait encore être actif si sa sauvegarde n’est pas accessible.
              </Text>
              <Pressable
                onPress={continueWithoutRestore}
                accessibilityRole="button"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Continuer sans restauration</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : ticket ? (
        <WaitingRoomScreen
          ticketId={ticket.id}
          initialTicket={ticket}
          onLeave={() => void handleLeave()}
        />
      ) : (
        <ReasonScreen onJoined={(newTicket) => void handleJoined(newTicket)} />
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  messageScreen: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    padding: 24,
  },
  message: { color: colors.muted, marginTop: 16, textAlign: 'center' },
  error: { color: colors.error, lineHeight: 24, textAlign: 'center' },
  warning: { color: colors.muted, lineHeight: 22, marginTop: 24, textAlign: 'center' },
  button: {
    alignSelf: 'center',
    backgroundColor: colors.green,
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  secondaryButton: {
    alignSelf: 'center',
    borderColor: colors.green,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  secondaryButtonText: { color: colors.green, fontSize: 16, fontWeight: '700' },
});
