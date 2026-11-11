import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, typography, borderRadius } from '../../theme';
import { AioSplashSvg } from '../../components/common';

type SplashScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroWidth = Math.min(width * 0.94, 540);
  const heroHeight = Math.round(heroWidth * (1300 / 1620));
  const glowSize = Math.min(width * 0.85, 420);

  const { checkSession } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowPulseAnim = useRef(new Animated.Value(0.6)).current;
  const isNavigatingRef = useRef(false);

  const navigateNext = async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    try {
      await checkSession();
      const state = useAuthStore.getState();

      if (state.isAuthenticated) {
        navigation.replace('MainApp');
      } else if (!state.isOnboarded) {
        navigation.replace('Onboarding');
      } else {
        navigation.replace('Auth');
      }
    } catch {
      navigation.replace('Onboarding');
    }
  };

  useEffect(() => {
    // Smooth cinematic entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Ambient background pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.6,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-advance after 4.2 seconds to allow enjoying the infinity animation
    const timer = setTimeout(navigateNext, 4200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <Pressable style={styles.container} onPress={navigateNext}>
      <StatusBar style="light" />

      {/* Deep Dark Sleek Fintech Gradient */}
      <LinearGradient
        colors={['#070A13', '#0F172A', '#0B1120']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Radial Backlight behind the SVG */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: glowPulseAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />

      {/* Big Hero AIO Splash SVG Artwork */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            width: heroWidth,
            height: heroHeight,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <AioSplashSvg
          width={heroWidth}
          height={heroHeight}
          wordColor="#FFFFFF"
        />
      </Animated.View>

      {/* Minimalist Subtitle & Status */}
      <Animated.View
        style={[
          styles.bottomInfo,
          { opacity: fadeAnim, bottom: Math.max(40, insets.bottom + 24) },
        ]}
      >
        <Text style={styles.slogan}>
          Tu vida en sincronía • Productividad, Finanzas & Bienestar
        </Text>

        <View style={styles.loadingIndicatorContainer}>
          <View style={styles.dot} />
          <Text style={styles.skipHint}>Toca para continuar</Text>
        </View>

        <Text style={styles.version}>v1.1.0 • Offline-First Experience</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 20,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  slogan: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: 16,
    letterSpacing: 0.4,
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
  },
  skipHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.cyanLight,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  version: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
