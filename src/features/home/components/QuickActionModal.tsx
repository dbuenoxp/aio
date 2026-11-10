import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ModalContainer, CustomInput, CustomButton } from '../../../components/common';
import { useTaskStore } from '../../../store/useTaskStore';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useFitnessStore } from '../../../store/useFitnessStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography, spacing } from '../../../theme';

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  initialAction?: 'task' | 'expense' | 'water' | null;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  visible,
  onClose,
  initialAction = null,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<'task' | 'expense' | 'water'>(
    initialAction || 'task'
  );

  // Quick Task states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [quickAlarmMinutes, setQuickAlarmMinutes] = useState<number | null>(15);

  // Quick Expense states
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  const { createTask } = useTaskStore();
  const { addTransaction, currency } = useFinanceStore();
  const { incrementWater, todayWater } = useFitnessStore();

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return;
    const now = new Date();
    const hasAlarm = quickAlarmMinutes !== null;
    const targetDate = hasAlarm
      ? new Date(now.getTime() + quickAlarmMinutes * 60 * 1000)
      : now;

    await createTask({
      title: taskTitle,
      category: 'Personal',
      priority: taskPriority,
      dueDate: targetDate,
      hasAlarm,
    });
    setTaskTitle('');
    onClose();
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    await addTransaction({
      type: 'expense',
      amount: amt,
      category: 'Otros',
      description: expenseDesc.trim() || 'Gasto rápido',
      date: new Date(),
    });
    setExpenseAmount('');
    setExpenseDesc('');
    onClose();
  };

  const handleAddWater = async () => {
    await incrementWater();
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // fallback
    }
    onClose();
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Acción Rápida"
      subtitle="Crea o registra actividad en segundos"
    >
      {/* Action Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('task')}
          style={[styles.tab, activeTab === 'task' && styles.activeTab]}
        >
          <Ionicons
            name="checkbox-outline"
            size={18}
            color={activeTab === 'task' ? colors.cyanLight : colors.textMuted}
          />
          <Text
            style={[styles.tabLabel, activeTab === 'task' && styles.activeTabLabel]}
          >
            Tarea
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('expense')}
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
        >
          <Ionicons
            name="card-outline"
            size={18}
            color={activeTab === 'expense' ? colors.cyanLight : colors.textMuted}
          />
          <Text
            style={[styles.tabLabel, activeTab === 'expense' && styles.activeTabLabel]}
          >
            Gasto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('water')}
          style={[styles.tab, activeTab === 'water' && styles.activeTab]}
        >
          <Ionicons
            name="water-outline"
            size={18}
            color={activeTab === 'water' ? colors.cyanLight : colors.textMuted}
          />
          <Text
            style={[styles.tabLabel, activeTab === 'water' && styles.activeTabLabel]}
          >
            Agua
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'task' && (
        <View style={styles.formContainer}>
          <CustomInput
            label="Título de la tarea"
            placeholder="Ej. Comprar materiales para el proyecto"
            value={taskTitle}
            onChangeText={setTaskTitle}
            leftIcon={<Ionicons name="create-outline" size={20} color={colors.textSecondary} />}
          />

          <Text style={styles.sectionTitle}>Prioridad</Text>
          <View style={styles.prioritiesRow}>
            {(['Baja', 'Media', 'Alta'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setTaskPriority(p)}
                style={[
                  styles.priorityOption,
                  taskPriority === p && styles.priorityOptionActive,
                  taskPriority === p && p === 'Alta' && { borderColor: colors.danger },
                  taskPriority === p && p === 'Media' && { borderColor: colors.warning },
                  taskPriority === p && p === 'Baja' && { borderColor: colors.mint },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    taskPriority === p && styles.priorityTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Recordatorio / Alarma</Text>
          <View style={styles.quickAlarmRow}>
            {[
              { label: 'Sin alarma', mins: null },
              { label: '⚡ 1 min', mins: 1 },
              { label: '5 min', mins: 5 },
              { label: '15 min', mins: 15 },
              { label: '1 hora', mins: 60 },
            ].map((opt) => {
              const isSelected = quickAlarmMinutes === opt.mins;
              return (
                <TouchableOpacity
                  key={String(opt.mins)}
                  onPress={() => setQuickAlarmMinutes(opt.mins)}
                  style={[
                    styles.quickAlarmChip,
                    isSelected && styles.quickAlarmChipActive,
                  ]}
                >
                  <Ionicons
                    name={opt.mins === null ? 'notifications-off-outline' : 'alarm-outline'}
                    size={13}
                    color={isSelected ? colors.cyanLight : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.quickAlarmChipText,
                      isSelected && styles.quickAlarmChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <CustomButton
            title="Crear Tarea"
            onPress={handleSaveTask}
            disabled={!taskTitle.trim()}
            variant="primary"
            style={styles.saveBtn}
          />
        </View>
      )}

      {activeTab === 'expense' && (
        <View style={styles.formContainer}>
          <CustomInput
            label={`Monto (${currency})`}
            placeholder="0.00"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            keyboardType="decimal-pad"
            leftIcon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
          />

          <CustomInput
            label="Descripción"
            placeholder="Ej. Café, Transporte, Almuerzo"
            value={expenseDesc}
            onChangeText={setExpenseDesc}
            leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
          />

          <CustomButton
            title="Registrar Gasto"
            onPress={handleSaveExpense}
            disabled={!expenseAmount.trim()}
            variant="danger"
            style={styles.saveBtn}
          />
        </View>
      )}

      {activeTab === 'water' && (
        <View style={styles.waterQuickContainer}>
          <LinearGradient
            colors={colors.gradients.water}
            style={styles.waterCircle}
          >
            <Ionicons name="water" size={48} color="#FFFFFF" />
            <Text style={styles.waterMlText}>+250 ml</Text>
          </LinearGradient>

          <Text style={styles.waterStatusText}>
            Llevas {todayWater.glasses} de {todayWater.targetGlasses} vasos hoy
          </Text>

          <CustomButton
            title="Registrar +1 Vaso de Agua"
            onPress={handleAddWater}
            variant="mint"
            icon={<Ionicons name="add-circle-outline" size={20} color="#FFF" />}
            style={styles.saveBtn}
          />
        </View>
      )}
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  activeTab: {
    backgroundColor: colors.surface,
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 6,
  },
  activeTabLabel: {
    color: colors.textPrimary,
  },
  formContainer: {
    width: '100%',
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  prioritiesRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  priorityOptionActive: {
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
  quickAlarmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  quickAlarmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAlarmChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderColor: colors.cyanLight,
  },
  quickAlarmChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickAlarmChipTextActive: {
    color: colors.cyanLight,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 8,
  },
  waterQuickContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  waterCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  waterMlText: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 4,
  },
  waterStatusText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 20,
  },
});
