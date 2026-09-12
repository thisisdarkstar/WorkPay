import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '../../components/ads/AdBanner';

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBarWrapper}>
      <AdBanner />
      <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName;
        switch (route.name) {
          case '(dashboard)':
            iconName = 'home-outline';
            break;
          case '(employeeManagement)':
            iconName = 'people-outline';
            break;
          case 'SalaryManagement':
            iconName = 'cash-outline';
            break;
          case '(settings)':
            iconName = 'settings-outline';
            break;
          default:
            iconName = 'ellipse-outline';
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tab}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? '#1e90ff' : '#999'}
            />
            <Text style={{ color: isFocused ? '#1e90ff' : '#999', fontSize: 12 }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

function AdminLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="(dashboard)"  options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="(employeeManagement)" options={{ title: 'Staff' }} />
      <Tabs.Screen name="SalaryManagement" options={{ title: 'Payroll' }} />
      <Tabs.Screen name="(settings)" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

export default AdminLayout;

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#192633',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#192633',
    paddingTop: 10,
  },
  tab: {
    alignItems: 'center',
  },
});