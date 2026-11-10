import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, ThemePalette, borderRadius, typography, shadows } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconGradient?: readonly [string, string, ...string[]];
  onPress?: () => void;
  trend?: {
    label: string;
    positive?: boolean;
  };
  style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconGradient,
  onPress,
  trend,
  style,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedGradient = iconGradient || colors.gradients.primary;
  const handlePress = async () => {
    if (!onPress) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // fallback
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={handlePress}
      disabled={!onPress}
      style={[styles.container, style]}
    >
      <View style={styles.topRow}>
        <LinearGradient
          colors={resolvedGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name={icon} size={20} color="#FFF" />
        </LinearGradient>

        {trend && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: trend.positive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
            ]}
          >
            <Ionicons
              name={trend.positive ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.positive ? colors.mint : colors.danger}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.positive ? colors.mint : colors.danger },
              ]}
            >
              {trend.label}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.surfaceGlassBorder,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  trendText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
});
