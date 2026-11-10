import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FitnessProfile } from '../../../types';
import { GlassCard, ProgressBar, CustomButton } from '../../../components/common';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface WeightGoalCardProps {
  profile: FitnessProfile;
  onAddWeight: (weight: number, note?: string) => Promise<void>;
  onUpdateTarget?: (targetWeight: number, initialWeight: number) => Promise<void>;
}

export const WeightGoalCard: React.FC<WeightGoalCardProps> = ({
  profile,
  onAddWeight,
  onUpdateTarget,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState(profile.currentWeight.toString());
  const [targetWeightInput, setTargetWeightInput] = useState(
    profile.targetWeight.toString()
  );
  const [initialWeightInput, setInitialWeightInput] = useState(
    profile.initialWeight.toString()
  );
  const [weightNote, setWeightNote] = useState('');
  const [loading, setLoading] = useState(false);

  const delta = (profile.currentWeight - profile.targetWeight).toFixed(1);
  const totalToChange = Math.abs(profile.initialWeight - profile.targetWeight);
  const currentChanged = Math.abs(profile.initialWeight - profile.currentWeight);
  const progress =
    totalToChange > 0
      ? Math.min(100, Math.max(0, Math.round((currentChanged / totalToChange) * 100)))
      : 100;

  const openModal = () => {
    setNewWeight(profile.currentWeight.toString());
    setTargetWeightInput(profile.targetWeight.toString());
    setInitialWeightInput(profile.initialWeight.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    const val = parseFloat(newWeight);
    const targetVal = parseFloat(targetWeightInput);
    const initVal = parseFloat(initialWeightInput);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      await onAddWeight(val, weightNote.trim());
      if (
        onUpdateTarget &&
        !isNaN(targetVal) &&
        targetVal > 0 &&
        !isNaN(initVal) &&
        initVal > 0
      ) {
        await onUpdateTarget(targetVal, initVal);
      }
      setWeightNote('');
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <LinearGradient
            colors={colors.gradients.mintCyan}
            style={styles.iconCircle}
          >
            <Ionicons name="scale-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.title}>Evolución de Peso</Text>
            <Text style={styles.subtitle}>
              Meta: {profile.targetWeight} {profile.unit}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={openModal}
          style={styles.logWeightButton}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={15} color={colors.mintLight} />
          <Text style={styles.logWeightText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Weights Row */}
      <View style={styles.weightsRow}>
        <View style={styles.weightBox}>
          <Text style={styles.weightLabel}>Inicial</Text>
          <Text style={styles.weightValue}>
            {profile.initialWeight} <Text style={styles.unitSmall}>{profile.unit}</Text>
          </Text>
        </View>

        <View style={styles.arrowBox}>
          <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={[styles.weightBox, styles.currentBox]}>
          <Text style={[styles.weightLabel, { color: colors.mintLight }]}>Actual</Text>
          <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
            {profile.currentWeight} <Text style={styles.unitSmall}>{profile.unit}</Text>
          </Text>
        </View>

        <View style={styles.arrowBox}>
          <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={styles.weightBox}>
          <Text style={styles.weightLabel}>Objetivo</Text>
          <Text style={[styles.weightValue, { color: colors.cyanLight }]}>
            {profile.targetWeight} <Text style={styles.unitSmall}>{profile.unit}</Text>
          </Text>
        </View>
      </View>

      {/* Progress Bar & Delta calculation */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.deltaText}>
            {parseFloat(delta) > 0
              ? `Faltan ${delta} ${profile.unit} para tu objetivo`
              : '¡Felicidades! Has alcanzado tu peso meta 🎉'}
          </Text>
          <Text style={styles.progressPercentText}>{progress}%</Text>
        </View>
        <ProgressBar
          progress={progress}
          height={8}
          gradientColors={colors.gradients.mintCyan}
        />
      </View>

      {/* Quick Modal to record weight */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Actualizar Peso y Meta ({profile.unit})
            </Text>

            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              PESO ACTUAL ({profile.unit.toUpperCase()})
            </Text>
            <TextInput
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              style={styles.modalInput}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  PESO META ({profile.unit.toUpperCase()})
                </Text>
                <TextInput
                  value={targetWeightInput}
                  onChangeText={setTargetWeightInput}
                  keyboardType="decimal-pad"
                  style={[styles.modalNoteInput, { marginBottom: 0, textAlign: 'center', fontWeight: '700' }]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  PESO INICIAL ({profile.unit.toUpperCase()})
                </Text>
                <TextInput
                  value={initialWeightInput}
                  onChangeText={setInitialWeightInput}
                  keyboardType="decimal-pad"
                  style={[styles.modalNoteInput, { marginBottom: 0, textAlign: 'center', fontWeight: '700' }]}
                />
              </View>
            </View>

            <TextInput
              placeholder="Nota (opcional, ej. En ayunas)"
              placeholderTextColor={colors.textMuted}
              value={weightNote}
              onChangeText={setWeightNote}
              style={styles.modalNoteInput}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <CustomButton
                title="Guardar Peso"
                onPress={handleSave}
                loading={loading}
                variant="mint"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </GlassCard>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      padding: 16,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    titleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
      fontSize: 16,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
    },
    logWeightButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.mint}20`,
      borderWidth: 1,
      borderColor: `${colors.mint}45`,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
    },
    logWeightText: {
      ...typography.caption,
      color: colors.mintLight,
      fontWeight: '700',
      marginLeft: 4,
    },
    weightsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    weightBox: {
      flex: 1,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      paddingVertical: 10,
      alignItems: 'center',
    },
    currentBox: {
      backgroundColor: `${colors.mint}18`,
      borderWidth: 1,
      borderColor: `${colors.mint}45`,
    },
    weightLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    weightValue: {
      ...typography.body,
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 2,
    },
    unitSmall: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    arrowBox: {
      paddingHorizontal: 6,
    },
    progressSection: {},
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    deltaText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    progressPercentText: {
      ...typography.caption,
      color: colors.mintLight,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 20,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 12,
      marginBottom: 12,
    },
    modalNoteInput: {
      ...typography.body,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 20,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
    },
    cancelBtnText: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
