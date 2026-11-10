import React, { useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCelebrationStore } from '../../store/useCelebrationStore';
import { useThemeStore } from '../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../theme';

interface ParticleConfig {
  angle: number;
  distance: number;
  color: string;
  size: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

const PARTICLES: ParticleConfig[] = [
  { angle: 0, distance: 125, color: '#10B981', size: 14, icon: 'star' },
  { angle: 28, distance: 140, color: '#22D3EE', size: 10 },
  { angle: 55, distance: 115, color: '#F59E0B', size: 15, icon: 'sparkles' },
  { angle: 82, distance: 135, color: '#EC4899', size: 10 },
  { angle: 110, distance: 120, color: '#6366F1', size: 13, icon: 'star' },
  { angle: 138, distance: 145, color: '#34D399', size: 11 },
  { angle: 165, distance: 125, color: '#FBBF24', size: 14, icon: 'sparkles' },
  { angle: 195, distance: 130, color: '#06B6D4', size: 10 },
  { angle: 222, distance: 140, color: '#A855F7', size: 14, icon: 'star' },
  { angle: 250, distance: 118, color: '#10B981', size: 11 },
  { angle: 278, distance: 138, color: '#F472B6', size: 15, icon: 'sparkles' },
  { angle: 305, distance: 125, color: '#38BDF8', size: 10 },
  { angle: 332, distance: 142, color: '#F59E0B', size: 13, icon: 'star' },
];

export const CelebrationModal: React.FC = () => {
  const { celebration, dismissCelebration } = useCelebrationStore();
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0.2)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!celebration) return;

    scaleAnim.setValue(0.6);
    opacityAnim.setValue(0);
    badgeScaleAnim.setValue(0.2);
    burstAnim.setValue(0);
    pulseAnim.setValue(1);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.timing(burstAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const autoTimer = setTimeout(() => {
      dismissCelebration();
    }, 3100);

    return () => {
      clearTimeout(autoTimer);
      pulseLoop.stop();
    };
  }, [celebration]);

  if (!celebration) return null;

  const isGoal = celebration.type === 'goal';
  const isMilestone = celebration.type === 'milestone';

  const headerTitle = isGoal
    ? '¡Meta Cumplida! 🏆'
    : isMilestone
    ? '¡Hito Completado! ✨'
    : '¡Felicidades! 🎉';

  const badgeLabel =
    celebration.badgeText ||
    (isGoal
      ? '100% META ALCANZADA'
      : isMilestone
      ? 'AVANCE DE META'
      : 'TAREA COMPLETADA');

  const mainIcon: keyof typeof Ionicons.glyphMap = isGoal
    ? 'trophy'
    : isMilestone
    ? 'ribbon'
    : 'checkmark-done-circle';

  const gradientColors: readonly [string, string, ...string[]] = isGoal
    ? ['#F59E0B', '#10B981']
    : isMilestone
    ? ['#6366F1', '#06B6D4']
    : ['#10B981', '#06B6D4'];

  return (
    <Modal
      visible={!!celebration}
      transparent
      animationType="none"
      onRequestClose={dismissCelebration}
    >
      <Pressable style={styles.backdrop} onPress={dismissCelebration}>
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Radial Confetti / Sparkle Burst Particles */}
          <View style={styles.particlesContainer} pointerEvents="none">
            {PARTICLES.map((p, idx) => {
              const rad = (p.angle * Math.PI) / 180;
              const targetX = Math.cos(rad) * p.distance;
              const targetY = Math.sin(rad) * p.distance - 20;

              const translateX = burstAnim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0, targetX, targetX * 1.08],
              });
              const translateY = burstAnim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0, targetY, targetY + 14],
              });
              const particleOpacity = burstAnim.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 1, 1, 0],
              });
              const particleScale = burstAnim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0.3, 1.25, 0.7],
              });

              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.particle,
                    {
                      opacity: particleOpacity,
                      transform: [
                        { translateX },
                        { translateY },
                        { scale: particleScale },
                      ],
                    },
                  ]}
                >
                  {p.icon ? (
                    <Ionicons name={p.icon} size={p.size + 4} color={p.color} />
                  ) : (
                    <View
                      style={{
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: p.color,
                      }}
                    />
                  )}
                </Animated.View>
              );
            })}
          </View>

          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Animated Center Trophy / Check Badge */}
            <Animated.View
              style={[
                styles.iconOuterGlow,
                {
                  transform: [
                    { scale: Animated.multiply(badgeScaleAnim, pulseAnim) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name={mainIcon} size={44} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>

            {/* Category Pill */}
            <View style={styles.badgePill}>
              <Ionicons name="sparkles" size={12} color={colors.mint} />
              <Text style={styles.badgePillText}>{badgeLabel}</Text>
            </View>

            {/* "¡Felicidades!" Title */}
            <Text style={styles.congratsTitle}>{headerTitle}</Text>

            {/* Completed Task / Milestone Name */}
            <Text style={styles.completedItemTitle} numberOfLines={2}>
              “{celebration.title}”
            </Text>

            {/* Motivational Subtitle */}
            <Text style={styles.subtitleText}>
              {celebration.subtitle ||
                (isGoal
                  ? '¡Completaste todos los hitos de esta meta! Tu disciplina está dando grandes resultados.'
                  : isMilestone
                  ? `¡Gran paso adelante! Tu meta ahora está al ${celebration.progress ?? 0}% de progreso.`
                  : '¡Excelente trabajo! Una tarea menos y un paso más cerca de tus objetivos del día.')}
            </Text>

            {typeof celebration.progress === 'number' && (
              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, celebration.progress)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  Progreso total: {celebration.progress}%
                </Text>
              </View>
            )}

            {/* Dismiss Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={dismissCelebration}
              style={styles.actionBtnWrap}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>¡Genial, seguir así!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(5, 10, 24, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    cardWrapper: {
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      justifyContent: 'center',
    },
    particlesContainer: {
      position: 'absolute',
      width: 1,
      height: 1,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    particle: {
      position: 'absolute',
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 22,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.mint,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 16,
    },
    iconOuterGlow: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1.5,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginBottom: 10,
    },
    badgePillText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.mint,
      letterSpacing: 0.8,
    },
    congratsTitle: {
      ...typography.h1,
      fontSize: 24,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    completedItemTitle: {
      ...typography.body,
      fontSize: 15,
      fontWeight: '700',
      color: colors.cyanLight,
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    subtitleText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 18,
    },
    progressSection: {
      width: '100%',
      marginBottom: 18,
      alignItems: 'center',
    },
    progressTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceLight,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.mint,
    },
    actionBtnWrap: {
      width: '100%',
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: borderRadius.md,
    },
    actionBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
  });

