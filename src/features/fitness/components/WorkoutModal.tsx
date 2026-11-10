import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ModalContainer,
  CustomInput,
  CustomButton,
} from '../../../components/common';
import { WorkoutCategory } from '../../../types';
import { useFitnessStore } from '../../../store/useFitnessStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface WorkoutModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: WorkoutCategory[] = [
  'Cardio',
  'Fuerza',
  'Flexibilidad',
  'HIIT',
  'Funcional',
  'Running',
];

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  visible,
  onClose,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('Fuerza');
  const [duration, setDuration] = useState('45');
  const [calories, setCalories] = useState('300');
  const [loading, setLoading] = useState(false);

  const { addWorkout } = useFitnessStore();

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await addWorkout({
        title,
        category,
        durationMinutes: parseInt(duration, 10) || 30,
        caloriesBurned: parseInt(calories, 10) || 200,
        date: new Date(),
      });

      setTitle('');
      setCategory('Fuerza');
      setDuration('45');
      setCalories('300');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Registrar Entrenamiento"
      subtitle="Guarda tu sesión y mantén el registro semanal"
    >
      <CustomInput
        label="Nombre del ejercicio o sesión"
        placeholder="Ej. Pecho, Tríceps & Abdomen"
        value={title}
        onChangeText={setTitle}
        leftIcon={<Ionicons name="barbell-outline" size={20} color={colors.textSecondary} />}
      />

      {/* Category Selection */}
      <Text style={styles.sectionLabel}>Modalidad</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.chip, category === cat && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.twoColRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <CustomInput
            label="Duración (Min)"
            placeholder="45"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            leftIcon={<Ionicons name="time-outline" size={20} color={colors.textSecondary} />}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <CustomInput
            label="Calorías Est."
            placeholder="300"
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            leftIcon={<Ionicons name="flame-outline" size={20} color={colors.textSecondary} />}
          />
        </View>
      </View>

      <CustomButton
        title="Registrar Sesión de Ejercicio"
        onPress={handleSave}
        loading={loading}
        disabled={!title.trim()}
        variant="primary"
        style={{ marginTop: 16 }}
      />
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
      marginBottom: 16,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: `${colors.primary}25`,
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
    twoColRow: {
      flexDirection: 'row',
    },
  });
