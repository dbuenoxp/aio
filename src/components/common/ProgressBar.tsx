import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  gradientColors?: readonly [string, string, ...string[]];
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  gradientColors,
  showLabel = false,
  style,
}) => {
  const { palette } = useThemeStore();
  const activeGradient = gradientColors ?? palette.gradients.mintCyan;
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>
            Progreso
          </Text>
          <Text style={[styles.percentage, { color: palette.cyanLight }]}>
            {clamped}%
          </Text>
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: palette.isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(15, 23, 42, 0.09)',
          },
        ]}
      >
        <LinearGradient
          colors={activeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.fill,
            { width: `${clamped}%`, borderRadius: height / 2 },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    ...typography.caption,
  },
  percentage: {
    ...typography.caption,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
