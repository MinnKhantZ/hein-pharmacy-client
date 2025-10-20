import { Stack } from 'expo-router';

export default function SalesDetailsLayout() {
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
        name="[id]"
        options={{
          title: 'Sale Details',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
