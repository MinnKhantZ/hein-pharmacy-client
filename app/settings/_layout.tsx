import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#2196F3',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Change Password',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: 'Terms & Conditions',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="print-layout"
        options={{
          title: 'Print Layout',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
