import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ModalContainer,
  CustomInput,
  CustomButton,
} from '../../../components/common';
import { TaskCategory, TaskPriority } from '../../../types';
import { useTaskStore } from '../../../store/useTaskStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { notificationService } from '../../../services/notifications/NotificationService';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: TaskCategory[] = [
  'Trabajo',
  'Personal',
  'Proyectos',
  'Salud',
  'Finanzas',
];
const PRIORITIES: TaskPriority[] = ['Baja', 'Media', 'Alta'];

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

function getDefaultReminderDateTime() {
  const target = new Date(Date.now() + 30 * 60 * 1000);
  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();
  const h24 = target.getHours();
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minute = target.getMinutes();
  return { year, month, day, hour: h12, minute, period };
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialDT = getDefaultReminderDateTime();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Trabajo');
  const [priority, setPriority] = useState<TaskPriority>('Media');
  const [hasAlarm, setHasAlarm] = useState(true);

  // Exact Date state (Day / Month / Year)
  const [selectedYear, setSelectedYear] = useState<number>(initialDT.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialDT.month);
  const [selectedDay, setSelectedDay] = useState<number>(initialDT.day);

  // Reminder time state (12-hour format, 1-minute precision)
  const [reminderHour, setReminderHour] = useState<number>(initialDT.hour);
  const [reminderMinute, setReminderMinute] = useState<number>(initialDT.minute);
  const [reminderPeriod, setReminderPeriod] = useState<'AM' | 'PM'>(
    initialDT.period
  );

  const [loading, setLoading] = useState(false);

  const { createTask } = useTaskStore();

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const safeDay = Math.min(selectedDay, daysInMonth);

  const adjustDay = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth, safeDay + delta);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(d.getDate());
  };

  const adjustMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    const maxD = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(Math.min(safeDay, maxD));
  };

  const applyQuickDaysOffset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setSelectedDay(d.getDate());
  };

  const applyRelativeMinutesOffset = (minutesOffset: number) => {
    setHasAlarm(true);
    const target = new Date(Date.now() + minutesOffset * 60 * 1000);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    const h24 = target.getHours();
    setReminderPeriod(h24 >= 12 ? 'PM' : 'AM');
    setReminderHour(h24 % 12 === 0 ? 12 : h24 % 12);
    setReminderMinute(target.getMinutes());
  };

  const incrementHour = () => {
    setReminderHour((prev) => (prev % 12) + 1);
  };

  const decrementHour = () => {
    setReminderHour((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const incrementMinute = () => {
    setReminderMinute((prev) => (prev + 1) % 60);
  };

  const decrementMinute = () => {
    setReminderMinute((prev) => (prev === 0 ? 59 : prev - 1));
  };

  const formattedDateString = `${safeDay.toString().padStart(2, '0')} ${MONTH_NAMES[selectedMonth]
    } ${selectedYear}`;

  const formattedAlarmTimeString = `${reminderHour
    .toString()
    .padStart(2, '0')}:${reminderMinute
      .toString()
      .padStart(2, '0')} ${reminderPeriod}`;

  const handleTestAlarm = () => {
    notificationService.triggerImmediateAlarm(
      title.trim() || 'Recordatorio de Tarea',
      description.trim() ||
      `Programado para el ${formattedDateString} a las ${formattedAlarmTimeString}`
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const dueDate = new Date(selectedYear, selectedMonth, safeDay);

      if (hasAlarm) {
        let hours24 = reminderHour % 12;
        if (reminderPeriod === 'PM') {
          hours24 += 12;
        }
        dueDate.setHours(hours24, reminderMinute, 0, 0);

        // If user selected the current minute (just seconds in the past), set 10s ahead so alarm triggers
        const now = new Date();
        if (
          dueDate.getTime() <= now.getTime() &&
          now.getTime() - dueDate.getTime() < 60 * 1000
        ) {
          dueDate.setTime(now.getTime() + 10 * 1000);
        }
      } else {
        dueDate.setHours(23, 59, 59, 999);
      }

      await createTask({
        title,
        description,
        category,
        priority,
        dueDate,
        hasAlarm,
      });

      // Reset fields
      setTitle('');
      setDescription('');
      setCategory('Trabajo');
      setPriority('Media');
      setHasAlarm(true);
      const defDT = getDefaultReminderDateTime();
      setSelectedYear(defDT.year);
      setSelectedMonth(defDT.month);
      setSelectedDay(defDT.day);
      setReminderHour(defDT.hour);
      setReminderMinute(defDT.minute);
      setReminderPeriod(defDT.period);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Nueva Tarea / Recordatorio"
      subtitle="Programa tus actividades con fecha, hora y alarma sonora"
      footer={
        <CustomButton
          title={
            hasAlarm
              ? `Agendar con Alarma (${formattedDateString} • ${formattedAlarmTimeString})`
              : 'Crear Tarea sin Alarma'
          }
          onPress={handleSave}
          loading={loading}
          disabled={!title.trim()}
          variant="primary"
        />
      }
    >
      <CustomInput
        label="Título de la tarea o recordatorio"
        placeholder="Ej. Entregar informe financiero, Tomar suplemento"
        value={title}
        onChangeText={setTitle}
        leftIcon={
          <Ionicons
            name="create-outline"
            size={20}
            color={colors.textSecondary}
          />
        }
      />

      <CustomInput
        label="Descripción o notas del aviso"
        placeholder="Detalles que aparecerán en la notificación..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={2}
        style={{ minHeight: 56, textAlignVertical: 'top' }}
      />

      {/* Category Selection */}
      <Text style={styles.sectionLabel}>Categoría</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.chip, category === cat && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                category === cat && styles.chipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority Selection */}
      <Text style={styles.sectionLabel}>Prioridad</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            style={[
              styles.priorityBox,
              priority === p && styles.priorityBoxActive,
              priority === p && p === 'Alta' && { borderColor: colors.danger },
              priority === p &&
              p === 'Media' && { borderColor: colors.warning },
              priority === p && p === 'Baja' && { borderColor: colors.mint },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                priority === p && styles.priorityTextActive,
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Section: Quick chips + Exact Day/Month/Year Selector */}
      <View style={styles.dateHeaderRow}>
        <Text style={styles.sectionLabel}>Fecha de la Tarea / Recordatorio</Text>
        <View style={styles.dateSelectedBadge}>
          <Ionicons name="calendar-outline" size={12} color={colors.cyanLight} />
          <Text style={styles.dateSelectedBadgeText}>{formattedDateString}</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {[
          { label: 'Hoy', days: 0 },
          { label: 'Mañana', days: 1 },
          { label: 'En 3 días', days: 3 },
          { label: 'En 1 semana', days: 7 },
        ].map((opt) => {
          const target = new Date();
          target.setDate(target.getDate() + opt.days);
          const isMatch =
            target.getFullYear() === selectedYear &&
            target.getMonth() === selectedMonth &&
            target.getDate() === safeDay;

          return (
            <TouchableOpacity
              key={opt.label}
              onPress={() => applyQuickDaysOffset(opt.days)}
              style={[styles.chip, isMatch && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, isMatch && styles.chipTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Interactive Day / Month / Year Stepper */}
      <View style={styles.dateStepperRow}>
        <View style={styles.dateUnit}>
          <TouchableOpacity
            onPress={() => adjustDay(1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-up" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.dateStepperValue}>
            {safeDay.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.stepperSub}>DÍA</Text>
          <TouchableOpacity
            onPress={() => adjustDay(-1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-down" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateSlash}>/</Text>

        <View style={styles.dateUnit}>
          <TouchableOpacity
            onPress={() => adjustMonth(1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-up" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.dateStepperValue}>
            {MONTH_NAMES[selectedMonth]}
          </Text>
          <Text style={styles.stepperSub}>MES</Text>
          <TouchableOpacity
            onPress={() => adjustMonth(-1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-down" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateSlash}>/</Text>

        <View style={styles.dateUnit}>
          <TouchableOpacity
            onPress={() => setSelectedYear((y) => y + 1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-up" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
          <Text style={styles.dateStepperValue}>{selectedYear}</Text>
          <Text style={styles.stepperSub}>AÑO</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear((y) => y - 1)}
            style={styles.stepperArrow}
          >
            <Ionicons name="chevron-down" size={16} color={colors.cyanLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Alarm Push Notification Toggle & Time Picker */}
      <View style={styles.alarmContainer}>
        <View style={styles.alarmToggleRow}>
          <View style={styles.alarmInfo}>
            <View
              style={[
                styles.alarmIconCircle,
                hasAlarm && styles.alarmIconCircleActive,
              ]}
            >
              <Ionicons
                name={hasAlarm ? 'alarm' : 'alarm-outline'}
                size={18}
                color={hasAlarm ? colors.cyanLight : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.alarmTitle}>
                Recordatorio con Alarma y Notificación
              </Text>
              <Text style={styles.alarmSubtitle}>
                {hasAlarm
                  ? `Sonará el ${formattedDateString} a las ${formattedAlarmTimeString}`
                  : 'Activa para recibir alarma sonora y aviso en pantalla'}
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
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerDivider} />

            <View style={styles.timeSectionHeader}>
              <View style={styles.timeHeaderTitleWrap}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.cyanLight}
                />
                <Text style={styles.timeSectionTitle}>
                  HORA DEL RECORDATORIO
                </Text>
              </View>
              <View style={styles.timeSelectedBadge}>
                <Text style={styles.timeSelectedBadgeText}>
                  {formattedAlarmTimeString}
                </Text>
              </View>
            </View>

            {/* Interactive Stepper Clock */}
            <View style={styles.stepperRow}>
              {/* Hours Column */}
              <View style={styles.stepperUnit}>
                <TouchableOpacity
                  style={styles.stepperArrow}
                  onPress={incrementHour}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-up"
                    size={18}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={styles.stepperValue}>
                    {reminderHour.toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.stepperSub}>HORA</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepperArrow}
                  onPress={decrementHour}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.stepperColon}>:</Text>

              {/* Minutes Column (1-min step) */}
              <View style={styles.stepperUnit}>
                <TouchableOpacity
                  style={styles.stepperArrow}
                  onPress={incrementMinute}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-up"
                    size={18}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={styles.stepperValue}>
                    {reminderMinute.toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.stepperSub}>MIN</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepperArrow}
                  onPress={decrementMinute}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.cyanLight}
                  />
                </TouchableOpacity>
              </View>

              {/* AM / PM Segment */}
              <View style={styles.periodSegment}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    reminderPeriod === 'AM' && styles.periodButtonActive,
                  ]}
                  onPress={() => setReminderPeriod('AM')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodText,
                      reminderPeriod === 'AM' && styles.periodTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    reminderPeriod === 'PM' && styles.periodButtonActive,
                  ]}
                  onPress={() => setReminderPeriod('PM')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodText,
                      reminderPeriod === 'PM' && styles.periodTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Relative & Fixed Time Presets */}
            <Text style={styles.quickLabel}>
              Programar rápido o elegir horario:
            </Text>
            <View style={styles.quickRow}>
              {[
                { label: '⚡ En 1 min', mins: 1 },
                { label: 'En 5 min', mins: 5 },
                { label: 'En 15 min', mins: 15 },
                { label: 'En 30 min', mins: 30 },
                { label: 'En 1 hora', mins: 60 },
              ].map((rel) => (
                <TouchableOpacity
                  key={rel.label}
                  style={styles.quickChip}
                  onPress={() => applyRelativeMinutesOffset(rel.mins)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{rel.label}</Text>
                </TouchableOpacity>
              ))}

              {[
                { label: '08:00 AM', hour: 8, minute: 0, period: 'AM' as const },
                { label: '10:00 AM', hour: 10, minute: 0, period: 'AM' as const },
                { label: '02:00 PM', hour: 2, minute: 0, period: 'PM' as const },
                { label: '06:00 PM', hour: 6, minute: 0, period: 'PM' as const },
                { label: '08:00 PM', hour: 8, minute: 0, period: 'PM' as const },
              ].map((preset) => {
                const isSelected =
                  reminderHour === preset.hour &&
                  reminderMinute === preset.minute &&
                  reminderPeriod === preset.period;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.quickChip,
                      isSelected && styles.quickChipActive,
                    ]}
                    onPress={() => {
                      setReminderHour(preset.hour);
                      setReminderMinute(preset.minute);
                      setReminderPeriod(preset.period);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        isSelected && styles.quickChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Test Alarm Button */}
            <TouchableOpacity
              onPress={handleTestAlarm}
              style={styles.testSoundButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name="volume-high-outline"
                size={16}
                color={colors.cyanLight}
              />
              <Text style={styles.testSoundButtonText}>
                Probar sonido de alarma y notificación ahora
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    sectionLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: 'rgba(79, 70, 229, 0.25)',
      borderColor: colors.primaryLight,
    },
    chipText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    priorityBox: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    priorityBoxActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    priorityText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    priorityTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    dateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    dateSelectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(6, 182, 212, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    dateSelectedBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.cyanLight,
    },
    dateStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    dateUnit: {
      alignItems: 'center',
      minWidth: 64,
    },
    dateStepperValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    dateSlash: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textMuted,
      marginHorizontal: 8,
    },
    alarmContainer: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      padding: 12,
      marginTop: 2,
      marginBottom: 8,
    },
    alarmToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    alarmInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    alarmIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    alarmIconCircleActive: {
      backgroundColor: 'rgba(6, 182, 212, 0.18)',
    },
    alarmTitle: {
      ...typography.body,
      fontWeight: '600',
    },
    alarmSubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    timePickerContainer: {
      marginTop: 12,
    },
    timePickerDivider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      marginBottom: 12,
    },
    timeSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    timeHeaderTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timeSectionTitle: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontSize: 11,
    },
    timeSelectedBadge: {
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    timeSelectedBadgeText: {
      fontSize: 11,
      color: colors.cyanLight,
      fontWeight: '700',
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    stepperUnit: {
      alignItems: 'center',
      width: 64,
    },
    stepperArrow: {
      padding: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperDisplay: {
      alignItems: 'center',
      paddingVertical: 2,
    },
    stepperValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 1,
    },
    stepperSub: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: 1,
    },
    stepperColon: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textSecondary,
      marginHorizontal: 8,
    },
    periodSegment: {
      marginLeft: 14,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
    },
    periodButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.sm,
    },
    periodButtonActive: {
      backgroundColor: colors.primary,
    },
    periodText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    periodTextActive: {
      color: '#FFFFFF',
    },
    quickLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 6,
      fontWeight: '500',
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    quickChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickChipActive: {
      backgroundColor: 'rgba(6, 182, 212, 0.18)',
      borderColor: colors.cyanLight,
    },
    quickChipText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    quickChipTextActive: {
      color: colors.cyanLight,
      fontWeight: '700',
    },
    testSoundButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(6, 182, 212, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.35)',
    },
    testSoundButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.cyanLight,
    },
  });
