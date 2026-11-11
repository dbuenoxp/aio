import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, typography, spacing } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface ModalContainerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  const { palette } = useThemeStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(
    insets.bottom + 14,
    Platform.OS === 'ios' ? 34 : 20
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            backgroundColor: palette.isDark
              ? 'rgba(0, 0, 0, 0.65)'
              : 'rgba(15, 23, 42, 0.45)',
          },
        ]}
      >
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.contentCard,
              {
                paddingBottom: bottomPadding,
                backgroundColor: palette.surface,
                borderColor: palette.borderLight,
              },
            ]}
          >
            <View
              style={[styles.handleBar, { backgroundColor: palette.border }]}
            />
            <View style={styles.headerRow}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: palette.textPrimary }]}>
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    style={[styles.subtitle, { color: palette.textSecondary }]}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={[
                  styles.closeButton,
                  { backgroundColor: palette.surfaceLight },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={palette.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {children}
            </ScrollView>

            {footer && (
              <View
                style={[
                  styles.footerContainer,
                  {
                    backgroundColor: palette.surface,
                    borderTopColor: palette.divider,
                  },
                ]}
              >
                {footer}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    maxHeight: Platform.OS === 'web' ? ('88vh' as any) : '90%',
    justifyContent: 'flex-end',
  },
  contentCard: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: spacing.lg,
    maxHeight: Platform.OS === 'web' ? ('88vh' as any) : '90%',
    flexDirection: 'column',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  footerContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
