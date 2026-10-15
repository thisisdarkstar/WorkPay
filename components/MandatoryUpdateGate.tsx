import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  checkAppVersionPolicy,
  openStoreForUpdate,
  getAppVersionCode,
  AppVersionPolicy,
} from '../services/AppVersionService';

interface MandatoryUpdateGateProps {
  children: React.ReactNode;
}

export default function MandatoryUpdateGate({ children }: MandatoryUpdateGateProps) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [policy, setPolicy] = useState<AppVersionPolicy | null>(null);

  const runVersionCheck = useCallback(async () => {
    try {
      const result = await checkAppVersionPolicy();
      if (result.required && result.policy) {
        setPolicy(result.policy);
        setStatus('blocked');
      } else {
        setStatus('allowed');
        if (result.policy) {
          setPolicy(result.policy);
        }
      }
    } catch {
      // Fail-open: allow user to continue if check fails
      setStatus('allowed');
    }
  }, []);

  useEffect(() => {
    runVersionCheck();

    // Recheck version whenever user brings the app to the foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        runVersionCheck();
      }
    });

    // Listen for HTTP 426 triggered by ApiService interceptor
    (globalThis as any).__onAppUpdateRequired = (data: any) => {
      if (data) {
        setPolicy((prev) => ({
          ...prev,
          ...data,
          updateRequired: true,
        }));
      }
      setStatus('blocked');
    };

    return () => {
      subscription.remove();
      delete (globalThis as any).__onAppUpdateRequired;
    };
  }, [runVersionCheck]);

  // If update is required, lock screen and show mandatory update screen
  if (status === 'blocked') {
    const currentCode = getAppVersionCode();
    const requiredCode = policy?.minimumSupportedVersionCode || 16;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>New Version Available</Text>
          </View>

          <Text style={styles.title}>{policy?.title || 'Update Required'}</Text>

          <Text style={styles.message}>
            {policy?.message ||
              'A new version of WorkPay is available with important improvements and bug fixes. Please update to continue.'}
          </Text>

          <View style={styles.versionInfoBox}>
            <Text style={styles.versionText}>
              Your Version: <Text style={styles.versionHighlight}>v{currentCode}</Text>
            </Text>
            <Text style={styles.versionDivider}>→</Text>
            <Text style={styles.versionText}>
              New Version: <Text style={styles.versionHighlight}>v{requiredCode}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={() => openStoreForUpdate(policy)}
          >
            <Text style={styles.updateButtonText}>Update to Latest Version</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.7}
            onPress={runVersionCheck}
          >
            <Text style={styles.retryButtonText}>Already updated? Check again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // During initial check, if not blocked, allow children immediately so UI doesn't stutter
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070E17',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0D1826',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#1678D4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 120, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 120, 212, 0.3)',
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
    marginBottom: 12,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  versionInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  versionHighlight: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  versionDivider: {
    marginHorizontal: 8,
    color: '#64748B',
  },
  updateButton: {
    width: '100%',
    backgroundColor: '#1678D4',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#1678D4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  retryButton: {
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
