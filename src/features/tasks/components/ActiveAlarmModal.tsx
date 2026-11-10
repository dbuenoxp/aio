import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTaskStore } from '../../../store/useTaskStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

export const ActiveAlarmModal: React.FC = () => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    activeAlarm,
    dismissActiveAlarm,
    snoozeActiveAlarm,
    toggleTask,
    tasks,
  } = useTaskStore();

  if (!activeAlarm) return null;

  const matchingTask = tasks.find((t) => t.id === activeAlarm.taskId);
  const timeFormatted = new Date(activeAlarm.scheduledAt).toLocaleTimeString(
    'es-ES',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  );

  const handleCompleteAndDismiss = async () => {
    if (matchingTask && !matchingTask.completed) {
      await toggleTask(matchingTask.id);
    }
    dismissActiveAlarm();
  };

  return (
    <Modal
      visible={!!activeAlarm}
      transparent
      animationType="fade"
      onRequestClose={dismissActiveAlarm}
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={colors.gradients.executiveHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.alarmCard}
        >
          {/* Ringing Icon Circle */}
          <View style={styles.alarmIconOuter}>
            <View style={styles.alarmIconInner}>
              <Ionicons name="alarm" size={38} color={colors.cyanLight} />
            </View>
          </View>

          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>
              RECORDATORIO / ALARMA ACTIVA • {timeFormatted}
            </Text>
          </View>

          <Text style={styles.alarmTitle}>{activeAlarm.title}</Text>

          {activeAlarm.description ? (
            <Text style={styles.alarmDescription}>
              {activeAlarm.description}
            </Text>
          ) : (
            <Text style={styles.alarmDescription}>
              ¡Es momento de realizar tu actividad programada!
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            {matchingTask && !matchingTask.completed && (
              <TouchableOpacity
                onPress={handleCompleteAndDismiss}
                style={styles.completeButton}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.completeButtonText}>
                  Completar Tarea y Silenciar
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                onPress={() => snoozeActiveAlarm(5)}
                style={styles.snoozeButton}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.cyanLight}
                />
                <Text style={styles.snoozeButtonText}>Posponer 5 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={dismissActiveAlarm}
                style={styles.dismissButton}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.dismissButtonText}>Detener Alarma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  alarmCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: 24,
    borderWidth: 1.5,
    borderColor: colors.cyanLight,
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  alarmIconOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alarmIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.cyanLight,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.cyanLight,
    letterSpacing: 0.6,
  },
  alarmTitle: {
    ...typography.h2,
    fontSize: 21,
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  alarmDescription: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 22,
    lineHeight: 20,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.mint,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
    width: '100%',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  snoozeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cyanLight,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  snoozeButtonText: {
    color: colors.cyanLight,
    fontWeight: '700',
    fontSize: 13,
  },
  dismissButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});

