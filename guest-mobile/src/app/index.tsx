import { Redirect } from 'expo-router';

import { useGuestSession } from '@/context/GuestSessionContext';

export default function IndexScreen() {
  const { token, portal } = useGuestSession();
  return <Redirect href={token && portal ? '/(tabs)' : '/activate'} />;
}
