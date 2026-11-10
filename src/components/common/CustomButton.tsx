import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { borderRadius, typography, shadows } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

export type ButtonVariant = 'primary' | 'mint' | 'secondary' | 'danger' | 'ghost';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hapticFeedback?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  hapticFeedback = true,
}) => {
  const { palette } = useThemeStore();

  const handlePress = async () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Platform fallback
      }
    }
    onPress();
  };

  const isGradient =
    variant === 'primary' || variant === 'mint' || variant === 'danger';

  let gradientColors: readonly [string, string, ...string[]] =
    palette.gradients.primary;
  if (variant === 'mint') gradientColors = palette.gradients.mintCyan;
  if (variant === 'danger') gradientColors = palette.gradients.danger;

  const content = (
    <View style={styles.innerContainer}>
      {loading ? (
        <ActivityIndicator
          color={isGradient ? '#FFFFFF' : palette.textPrimary}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.leftIcon}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              { color: isGradient ? '#FFFFFF' : palette.textPrimary },
              variant === 'secondary' && { color: palette.textPrimary },
              variant === 'ghost' && { color: palette.cyanLight },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.rightIcon}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  if (isGradient) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.wrapper, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientButton, { shadowColor: palette.primary }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.wrapper,
        styles.buttonBase,
        variant === 'secondary' && {
          backgroundColor: palette.surfaceLight,
          borderWidth: 1,
          borderColor: palette.borderLight,
        },
        variant === 'ghost' && styles.ghostButton,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
  },
  gradientButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  buttonBase: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.button,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
