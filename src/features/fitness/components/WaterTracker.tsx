import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WaterLog } from '../../../types';
import { GlassCard, ProgressBar } from '../../../components/common';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface WaterTrackerProps {
  waterLog: WaterLog;
  reminderEnabled: boolean;
  reminderHours: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleReminder: (enabled: boolean, hours?: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  waterLog,
  reminderEnabled,
  reminderHours,
  onIncrement,
  onDecrement,
  onToggleReminder,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const percentage = Math.min(
    100,
    Math.round((waterLog.glasses / waterLog.targetGlasses) * 100)
  );

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <LinearGradient
            colors={colors.gradients.water}
            style={styles.waterIconCircle}
          >
            <Ionicons name="water" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.title}>Control de Hidratación</Text>
            <Text style={styles.subtitle}>
              Meta diaria: {waterLog.targetGlasses} vasos (2,000 ml)
            </Text>
          </View>
        </View>

        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
      </View>

      {/* Main Counter Graphic */}
      <View style={styles.counterRow}>
        <TouchableOpacity
          onPress={onDecrement}
          disabled={waterLog.glasses <= 0}
          style={[
            styles.stepperButton,
            waterLog.glasses <= 0 && styles.stepperDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.displayArea}>
          <Text style={styles.glassesCount}>{waterLog.glasses}</Text>
          <Text style={styles.glassesLabel}>vasos tomados</Text>
          <Text style={styles.mlAmount}>{waterLog.amountMl} ml / 2000 ml</Text>
        </View>

        <TouchableOpacity
          onPress={onIncrement}
          style={styles.stepperButtonAdd}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={colors.gradients.water}
            style={styles.gradientAdd}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        progress={percentage}
        height={8}
        gradientColors={colors.gradients.water}
        style={{ marginVertical: 14 }}
      />

      {/* Visual Glass Dots */}
      <View style={styles.glassesDotsRow}>
        {Array.from({ length: waterLog.targetGlasses }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.glassDot,
              idx < waterLog.glasses && styles.glassDotFilled,
            ]}
          >
            <Ionicons
              name="water"
              size={12}
              color={idx < waterLog.glasses ? '#FFF' : colors.textMuted}
            />
          </View>
        ))}
      </View>

      {/* Recurring Hydration Reminder Option */}
      <View style={styles.reminderRow}>
        <View style={styles.reminderInfo}>
          <Ionicons name="alarm-outline" size={18} color={colors.cyanLight} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.reminderTitle}>
              Alerta recurrente cada {reminderHours} horas
            </Text>
            <Text style={styles.reminderSubtitle}>
              Recordatorios periódicos mediante notificación local
            </Text>
          </View>
        </View>

        <Switch
          value={reminderEnabled}
          onValueChange={(val) => onToggleReminder(val, reminderHours)}
          trackColor={{ false: colors.border, true: colors.cyan }}
          thumbColor={reminderEnabled ? '#FFF' : '#94A3B8'}
        />
      </View>
    </GlassCard>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      padding: 16,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    waterIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
      fontSize: 16,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
    },
    percentageBadge: {
      backgroundColor: `${colors.cyan}20`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: `${colors.cyan}45`,
    },
    percentageText: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '700',
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 8,
    },
    stepperButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperDisabled: {
      opacity: 0.3,
    },
    stepperButtonAdd: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
    },
    gradientAdd: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    displayArea: {
      alignItems: 'center',
    },
    glassesCount: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.textPrimary,
      lineHeight: 44,
    },
    glassesLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    mlAmount: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '600',
      marginTop: 2,
    },
    glassesDotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    glassDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassDotFilled: {
      backgroundColor: colors.cyan,
      borderColor: colors.cyanLight,
    },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    reminderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    reminderTitle: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reminderSubtitle: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
  });
