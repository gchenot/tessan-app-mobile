import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReasonScreen } from './src/ReasonScreen';
import { WaitingRoomScreen } from './src/WaitingRoomScreen';
import type { Ticket } from './src/api';

export default function App() {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  return (
    <SafeAreaProvider>
      {ticket ? (
        <WaitingRoomScreen
          ticketId={ticket.id}
          initialTicket={ticket}
          onLeave={() => setTicket(null)}
        />
      ) : (
        <ReasonScreen onJoined={setTicket} />
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
