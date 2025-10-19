import { Stack } from 'expo-router';

export default function ProfileLayout() {
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
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="manage-owners"
        options={{
          title: 'Manage Owners',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
