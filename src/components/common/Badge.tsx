import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { borderRadius, typography } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  variant?: 'solid' | 'subtle' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color,
  bgColor,
  variant = 'subtle',
  style,
}) => {
  const { palette } = useThemeStore();
  const activeColor = color ?? palette.cyanLight;

  let background = bgColor;
  let textCol = activeColor;
  let borderColor = 'transparent';

  if (variant === 'subtle') {
    background = bgColor || `${activeColor}20`;
    textCol = activeColor;
  } else if (variant === 'solid') {
    background = activeColor;
    textCol = '#FFFFFF';
  } else if (variant === 'outline') {
    background = 'transparent';
    borderColor = activeColor;
    textCol = activeColor;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: background,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textCol }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
