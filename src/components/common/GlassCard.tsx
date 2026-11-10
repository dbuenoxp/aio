import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, shadows } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradientColors?: readonly [string, string, ...string[]];
  borderColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  gradientColors,
  borderColor,
}) => {
  const { palette } = useThemeStore();
  const activeBorderColor = borderColor ?? palette.surfaceGlassBorder;

  if (gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            backgroundColor: palette.surfaceCard,
            borderColor: activeBorderColor,
            shadowOpacity: palette.isDark ? 0.25 : 0.07,
          },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceCard,
          borderColor: activeBorderColor,
          shadowOpacity: palette.isDark ? 0.25 : 0.07,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    ...shadows.card,
  },
});
