import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ModalContainer,
  CustomInput,
  CustomButton,
} from '../../../components/common';
import { GoalTerm, GoalCategory } from '../../../types';
import { useGoalStore } from '../../../store/useGoalStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
}

const TERMS: GoalTerm[] = ['Corto', 'Mediano', 'Largo'];
const CATEGORIES: GoalCategory[] = ['Finanzas', 'Carrera', 'Personal', 'Salud', 'Educación'];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onClose,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState<GoalTerm>('Mediano');
  const [category, setCategory] = useState<GoalCategory>('Finanzas');
  const [targetMonths, setTargetMonths] = useState(6);
  const [milestones, setMilestones] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const { createGoal } = useGoalStore();

  const handleAddMilestoneInput = () => {
    setMilestones((prev) => [...prev, '']);
  };

  const handleMilestoneChange = (text: string, index: number) => {
    setMilestones((prev) => {
      const copy = [...prev];
      copy[index] = text;
      return copy;
    });
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + targetMonths);

      const validMilestones = milestones.filter((m) => m.trim().length > 0);

      await createGoal({
        title,
        description,
        term,
        category,
        targetDate,
        milestones: validMilestones,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setTerm('Mediano');
      setCategory('Finanzas');
      setTargetMonths(6);
      setMilestones(['']);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Nueva Meta Personal"
      subtitle="Define tu visión y trázala con hitos medibles"
    >
      <CustomInput
        label="Título de la meta"
        placeholder="Ej. Ahorrar $10,000 USD para maestría"
        value={title}
        onChangeText={setTitle}
        leftIcon={<Ionicons name="trophy-outline" size={20} color={colors.textSecondary} />}
      />

      <CustomInput
        label="Descripción o propósito"
        placeholder="¿Por qué es importante esta meta para ti?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={2}
        style={{ minHeight: 60, textAlignVertical: 'top' }}
      />

      {/* Horizon Term Selector */}
      <Text style={styles.sectionLabel}>Plazo de la Proyección</Text>
      <View style={styles.chipRow}>
        {TERMS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => {
              setTerm(t);
              if (t === 'Corto') setTargetMonths(3);
              else if (t === 'Mediano') setTargetMonths(6);
              else setTargetMonths(18);
            }}
            style={[styles.chip, term === t && styles.chipActive]}
          >
            <Text style={[styles.chipText, term === t && styles.chipTextActive]}>
              {t} Plazo {t === 'Corto' ? '(~3m)' : t === 'Mediano' ? '(~6m)' : '(+1a)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Selector */}
      <Text style={styles.sectionLabel}>Categoría</Text>
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

      {/* Milestones / Hitos */}
      <View style={styles.milestonesHeader}>
        <Text style={styles.sectionLabel}>Hitos Clave (Milestones)</Text>
        <TouchableOpacity onPress={handleAddMilestoneInput} style={styles.addHitoButton}>
          <Ionicons name="add" size={16} color={colors.cyanLight} />
          <Text style={styles.addHitoText}>Añadir Hito</Text>
        </TouchableOpacity>
      </View>

      {milestones.map((m, idx) => (
        <View key={idx} style={styles.milestoneInputRow}>
          <View style={styles.milestoneIndexBadge}>
            <Text style={styles.milestoneIndexText}>{idx + 1}</Text>
          </View>
          <TextInput
            placeholder={`Ej. Hito ${idx + 1}: Completar primera fase`}
            placeholderTextColor={colors.textMuted}
            value={m}
            onChangeText={(text) => handleMilestoneChange(text, idx)}
            style={styles.milestoneInput}
          />
          {milestones.length > 1 && (
            <TouchableOpacity
              onPress={() => handleRemoveMilestone(idx)}
              style={styles.removeHitoBtn}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <CustomButton
        title="Crear Meta & Hitos"
        onPress={handleSave}
        loading={loading}
        disabled={!title.trim()}
        variant="mint"
        style={{ marginTop: 24 }}
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
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: `${colors.mint}22`,
      borderColor: colors.mint,
    },
    chipText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.mintLight,
      fontWeight: '700',
    },
    milestonesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    addHitoButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addHitoText: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '700',
      marginLeft: 4,
    },
    milestoneInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      marginBottom: 8,
      minHeight: 44,
    },
    milestoneIndexBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    milestoneIndexText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    milestoneInput: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: 6,
    },
    removeHitoBtn: {
      padding: 6,
    },
  });
