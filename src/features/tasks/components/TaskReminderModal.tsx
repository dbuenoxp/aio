import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalContainer, CustomButton, Badge } from '../../../components/common';
import { Task } from '../../../types';
import { useTaskStore } from '../../../store/useTaskStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { notificationService } from '../../../services/notifications/NotificationService';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface TaskReminderModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function extractDateTimeParts(isoStr?: string | null) {
  const base = isoStr ? new Date(isoStr) : new Date(Date.now() + 30 * 60 * 1000);
  const year = base.getFullYear();
  const month = base.getMonth(); // 0-11
  const day = base.getDate();
  const h24 = base.getHours();
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minute = base.getMinutes();
  return { year, month, day, hour12, minute, period };
}

export const TaskReminderModal: React.FC<TaskReminderModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { updateTaskReminder } = useTaskStore();

  const [hasAlarm, setHasAlarm] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [day, setDay] = useState(new Date().getDate());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && task) {
      setHasAlarm(task.hasAlarm ?? true);
      const parts = extractDateTimeParts(task.alarmTime || task.dueDate);
      setYear(parts.year);
      setMonth(parts.month);
      setDay(parts.day);
      setHour(parts.hour12);
      setMinute(parts.minute);
      setPeriod(parts.period);
    }
  }, [visible, task]);

  if (!task) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  const adjustDay = (delta: number) => {
    const d = new Date(year, month, safeDay + delta);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setDay(d.getDate());
  };

  const adjustMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    const maxD = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setDay(Math.min(safeDay, maxD));
  };

  const adjustYear = (delta: number) => {
    setYear((prev) => prev + delta);
  };

  const applyRelativePreset = (minutesFromNow: number) => {
    setHasAlarm(true);
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setYear(target.getFullYear());
    setMonth(target.getMonth());
    setDay(target.getDate());
    const h24 = target.getHours();
    setPeriod(h24 >= 12 ? 'PM' : 'AM');
    setHour(h24 % 12 === 0 ? 12 : h24 % 12);
    setMinute(target.getMinutes());
  };

  const buildSelectedDate = () => {
    let h24 = hour % 12;
    if (period === 'PM') h24 += 12;
    const d = new Date(year, month, safeDay, h24, minute, 0, 0);
    const now = new Date();
    // If user selected the exact current minute, schedule 10 seconds ahead so it rings shortly
    if (
      hasAlarm &&
      d.getTime() <= now.getTime() &&
      now.getTime() - d.getTime() < 60 * 1000
    ) {
      return new Date(now.getTime() + 10 * 1000);
    }
    return d;
  };

  const formattedDateString = `${safeDay.toString().padStart(2, '0')} ${MONTH_NAMES[month]
    } ${year}`;
  const formattedTimeString = `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')} ${period}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const targetDate = buildSelectedDate();
      await updateTaskReminder(task.id, targetDate, hasAlarm);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlarm = () => {
    notificationService.triggerImmediateAlarm(
      task.title,
      task.description,
      task.id
    );
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Recordatorio y Alarma"
      subtitle="Configura la fecha y hora exacta del aviso para esta tarea"
      footer={
        <CustomButton
          title={
            hasAlarm
              ? `Guardar Recordatorio (${formattedDateString} • ${formattedTimeString})`
              : 'Guardar sin Alarma'
          }
          onPress={handleSave}
          loading={saving}
          variant="primary"
        />
      }
    >
      {/* Task Summary Header */}
      <View style={styles.taskSummaryBox}>
        <View style={styles.taskSummaryTop}>
          <Badge label={task.category} color={colors.cyanLight} />
          <Badge
            label={`Prioridad ${task.priority}`}
            color={
              task.priority === 'Alta'
                ? colors.danger
                : task.priority === 'Media'
                  ? colors.warning
                  : colors.mint
            }
          />
        </View>
        <Text style={styles.taskTitleText}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.taskDescText}>{task.description}</Text>
        ) : null}
      </View>

      {/* Alarm & Notification Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View
              style={[
                styles.alarmIconCircle,
                hasAlarm && styles.alarmIconCircleActive,
              ]}
            >
              <Ionicons
                name={hasAlarm ? 'notifications' : 'notifications-off-outline'}
                size={18}
                color={hasAlarm ? colors.cyanLight : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.toggleTitle}>
                Activar Recordatorio y Alarma Sonora
              </Text>
              <Text style={styles.toggleSubtitle}>
                {hasAlarm
                  ? `Sonará el ${formattedDateString} a las ${formattedTimeString}`
                  : 'Sin aviso programado'}
              </Text>
            </View>
          </View>
          <Switch
            value={hasAlarm}
            onValueChange={setHasAlarm}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={hasAlarm ? colors.cyanLight : '#94A3B8'}
          />
        </View>

        {hasAlarm && (
          <TouchableOpacity
            onPress={handleTestAlarm}
            style={styles.testAlarmBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="volume-high" size={16} color={colors.cyanLight} />
            <Text style={styles.testAlarmBtnText}>
              Probar cómo suena la alarma y notificación
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Relative Presets */}
      <Text style={styles.sectionLabel}>Programación Rápida</Text>
      <View style={styles.quickPresetsRow}>
        {[
          { label: 'En 1 min', mins: 1 },
          { label: 'En 5 min', mins: 5 },
          { label: 'En 15 min', mins: 15 },
          { label: 'En 30 min', mins: 30 },
          { label: 'En 1 hora', mins: 60 },
          { label: 'Mañana', mins: 24 * 60 },
        ].map((p) => (
          <TouchableOpacity
            key={p.label}
            onPress={() => applyRelativePreset(p.mins)}
            style={styles.presetChip}
            activeOpacity={0.75}
          >
            <Ionicons
              name="flash-outline"
              size={12}
              color={colors.cyanLight}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.presetChipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exact Date Picker (Day / Month / Year) */}
      <Text style={styles.sectionLabel}>Fecha Exacta del Recordatorio</Text>
      <View style={styles.stepperCard}>
        {/* Day */}
        <View style={styles.stepperColumn}>
          <TouchableOpacity
            onPress={() => adjustDay(1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-up" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.stepperVal}>
            {safeDay.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.stepperSub}>DÍA</Text>
          <TouchableOpacity
            onPress={() => adjustDay(-1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dividerSlash}>/</Text>

        {/* Month */}
        <View style={styles.stepperColumn}>
          <TouchableOpacity
            onPress={() => adjustMonth(1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-up" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.stepperVal}>{MONTH_NAMES[month]}</Text>
          <Text style={styles.stepperSub}>MES</Text>
          <TouchableOpacity
            onPress={() => adjustMonth(-1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dividerSlash}>/</Text>

        {/* Year */}
        <View style={styles.stepperColumn}>
          <TouchableOpacity
            onPress={() => adjustYear(1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-up" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.stepperVal}>{year}</Text>
          <Text style={styles.stepperSub}>AÑO</Text>
          <TouchableOpacity
            onPress={() => adjustYear(-1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Exact Time Picker (Hour : Minute AM/PM) */}
      <Text style={styles.sectionLabel}>Hora Exacta de la Alarma</Text>
      <View style={styles.stepperCard}>
        {/* Hour */}
        <View style={styles.stepperColumn}>
          <TouchableOpacity
            onPress={() => setHour((h) => (h % 12) + 1)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-up" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.stepperVal}>
            {hour.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.stepperSub}>HORA</Text>
          <TouchableOpacity
            onPress={() => setHour((h) => (h === 1 ? 12 : h - 1))}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dividerSlash}>:</Text>

        {/* Minute (1-minute precision) */}
        <View style={styles.stepperColumn}>
          <TouchableOpacity
            onPress={() => setMinute((m) => (m + 1) % 60)}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-up" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.stepperVal}>
            {minute.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.stepperSub}>MIN</Text>
          <TouchableOpacity
            onPress={() => setMinute((m) => (m === 0 ? 59 : m - 1))}
            style={styles.arrowBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        {/* AM / PM */}
        <View style={styles.periodSegment}>
          <TouchableOpacity
            onPress={() => setPeriod('AM')}
            style={[
              styles.periodBtn,
              period === 'AM' && styles.periodBtnActive,
            ]}
          >
            <Text
              style={[
                styles.periodBtnText,
                period === 'AM' && styles.periodBtnTextActive,
              ]}
            >
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPeriod('PM')}
            style={[
              styles.periodBtn,
              period === 'PM' && styles.periodBtnActive,
            ]}
          >
            <Text
              style={[
                styles.periodBtnText,
                period === 'PM' && styles.periodBtnTextActive,
              ]}
            >
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    taskSummaryBox: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 12,
      marginBottom: 12,
    },
    taskSummaryTop: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    taskTitleText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    taskDescText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 3,
    },
    toggleCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
      padding: 12,
      marginBottom: 14,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    alarmIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    alarmIconCircleActive: {
      backgroundColor: 'rgba(6, 182, 212, 0.18)',
    },
    toggleTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    toggleSubtitle: {
      fontSize: 11,
      color: colors.cyanLight,
      marginTop: 2,
    },
    testAlarmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 8,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(6, 182, 212, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.35)',
    },
    testAlarmBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.cyanLight,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    quickPresetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 14,
    },
    presetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.full,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    presetChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    stepperCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    stepperColumn: {
      alignItems: 'center',
      minWidth: 64,
    },
    arrowBtn: {
      padding: 4,
    },
    stepperVal: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    stepperSub: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 1,
    },
    dividerSlash: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textMuted,
      marginHorizontal: 8,
    },
    periodSegment: {
      marginLeft: 12,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
    },
    periodBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
    },
    periodBtnActive: {
      backgroundColor: colors.primary,
    },
    periodBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    periodBtnTextActive: {
      color: '#FFFFFF',
    },
  });

