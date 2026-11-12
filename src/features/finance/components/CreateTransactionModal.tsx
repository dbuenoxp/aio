import React, { useState, useMemo, useEffect } from 'react';
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
import { TransactionType, TransactionCategory } from '../../../types';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';

interface CreateTransactionModalProps {
  visible: boolean;
  onClose: () => void;
}

const CURRENCY_OPTIONS = [
  { code: 'PEN', label: 'Soles (PEN)', symbol: 'S/. ' },
  { code: 'USD', label: 'Dólares (USD)', symbol: '$' },
  { code: 'EUR', label: 'Euros (EUR)', symbol: '€ ' },
];

const CATEGORIES: TransactionCategory[] = [
  'Comida',
  'Servicios',
  'Inversión',
  'Transporte',
  'Salario',
  'Educación',
  'Entretenimiento',
  'Salud',
  'Otros',
];

const PERCENTAGE_PRESETS = [
  { label: '100% (Todo)', value: 100 },
  { label: '50% (Mitad/Mitad)', value: 50 },
  { label: '33.3% (1/3)', value: 33.33 },
  { label: '25% (1/4)', value: 25 },
  { label: '75%', value: 75 },
];

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  visible,
  onClose,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { addTransaction, currency, setCurrency, transactions } = useFinanceStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('PEN');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Comida');
  const [description, setDescription] = useState('');
  const [involvedPeople, setInvolvedPeople] = useState<string[]>([]);
  const [personInput, setPersonInput] = useState('');
  const [myPercentage, setMyPercentage] = useState<string>('100');
  const [hasManuallySetPercentage, setHasManuallySetPercentage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedCurrency(currency || 'PEN');
    }
  }, [visible, currency]);

  const currencySymbol =
    selectedCurrency === 'USD'
      ? '$'
      : selectedCurrency === 'PEN'
      ? 'S/. '
      : '€ ';

  // Extract previously used people from existing transactions for 1-tap selection
  const recentPeople = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.involvedPeople && tx.involvedPeople.length > 0) {
        for (const p of tx.involvedPeople) {
          if (p.trim()) set.add(p.trim());
        }
      }
    }
    return Array.from(set).slice(0, 8);
  }, [transactions]);

  // Include both added chips and any currently typed text in the input
  const effectivePeople = useMemo(() => {
    const extra = personInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const combined = [...involvedPeople];
    for (const p of extra) {
      if (!combined.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
        combined.push(p);
      }
    }
    return combined;
  }, [involvedPeople, personInput]);

  const parsedTotalAmount = parseFloat(amount) || 0;
  const parsedPercentage = Math.min(
    100,
    Math.max(0, parseFloat(myPercentage) || 0)
  );
  const effectivePercentage = parsedPercentage;
  const myShareAmount = Number(
    ((parsedTotalAmount * effectivePercentage) / 100).toFixed(2)
  );

  const handleAddPerson = () => {
    const names = personInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    const updated = [...involvedPeople];
    for (const name of names) {
      if (!updated.some((p) => p.toLowerCase() === name.toLowerCase())) {
        updated.push(name);
      }
    }
    setInvolvedPeople(updated);
    setPersonInput('');

    // If expense and user hasn't manually changed %, default to 50% (Mitad/Mitad) when adding first person
    if (type === 'expense' && !hasManuallySetPercentage && myPercentage === '100') {
      setMyPercentage('50');
    }
  };

  const handleTogglePerson = (name: string) => {
    const exists = involvedPeople.some(
      (p) => p.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      const next = involvedPeople.filter(
        (p) => p.toLowerCase() !== name.toLowerCase()
      );
      setInvolvedPeople(next);
      if (type === 'expense' && !hasManuallySetPercentage && next.length === 0) {
        setMyPercentage('100');
      }
    } else {
      const next = [...involvedPeople, name];
      setInvolvedPeople(next);
      if (type === 'expense' && !hasManuallySetPercentage && myPercentage === '100') {
        setMyPercentage('50');
      }
    }
  };

  const handleRemovePerson = (name: string) => {
    const next = involvedPeople.filter((p) => p !== name);
    setInvolvedPeople(next);
    if (type === 'expense' && !hasManuallySetPercentage && next.length === 0) {
      setMyPercentage('100');
    }
  };

  const handleSelectPercentagePreset = (val: number) => {
    setHasManuallySetPercentage(true);
    setMyPercentage(String(val));
  };

  const handleCustomPercentageChange = (text: string) => {
    setHasManuallySetPercentage(true);
    const cleaned = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 100) {
      setMyPercentage('100');
    } else {
      setMyPercentage(cleaned);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setType('expense');
    setSelectedCurrency('PEN');
    setCategory('Comida');
    setInvolvedPeople([]);
    setPersonInput('');
    setMyPercentage('100');
    setHasManuallySetPercentage(false);
  };

  const handleSave = async () => {
    if (isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) return;
    if (effectivePercentage <= 0) return;

    setLoading(true);
    try {
      const finalAmount = myShareAmount;

      if (selectedCurrency !== currency) {
        setCurrency(selectedCurrency);
      }

      await addTransaction({
        type,
        amount: finalAmount,
        totalAmount: parsedTotalAmount,
        myPercentage: effectivePercentage,
        involvedPeople: effectivePeople,
        category,
        description:
          description.trim() ||
          (type === 'income' ? 'Ingreso registrado' : 'Gasto registrado'),
        date: new Date(),
        currency: selectedCurrency,
      });

      resetForm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalContainer
      visible={visible}
      onClose={onClose}
      title="Nueva Transacción"
      subtitle="Registra ingresos (+ suma) y gastos (- resta) con su categoría"
      footer={
        <CustomButton
          title={
            type === 'income'
              ? `Registrar Ingreso (+${currencySymbol}${(myShareAmount || 0).toFixed(2)})`
              : effectivePercentage < 100 && parsedTotalAmount > 0
              ? `Registrar Gasto (-${currencySymbol}${myShareAmount.toFixed(2)})`
              : `Registrar Gasto (-${currencySymbol}${(myShareAmount || 0).toFixed(2)})`
          }
          onPress={handleSave}
          loading={loading}
          disabled={
            !amount.trim() ||
            parsedTotalAmount <= 0 ||
            effectivePercentage <= 0
          }
          variant={type === 'income' ? 'mint' : 'danger'}
        />
      }
    >
      {/* Type Toggle: Gasto vs Ingreso */}
      <View style={styles.typeToggleContainer}>
        <TouchableOpacity
          onPress={() => {
            setType('expense');
            if (category === 'Salario') setCategory('Comida');
          }}
          style={[styles.typeButton, type === 'expense' && styles.typeExpenseActive]}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={18}
            color={type === 'expense' ? '#FFF' : colors.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              type === 'expense' && styles.typeTextActive,
            ]}
          >
            Gasto / Debo (-)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setType('income');
            setCategory('Salario');
            if (!hasManuallySetPercentage) {
              setMyPercentage('100');
            }
          }}
          style={[styles.typeButton, type === 'income' && styles.typeIncomeActive]}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={18}
            color={type === 'income' ? '#FFF' : colors.textMuted}
          />
          <Text
            style={[
              styles.typeText,
              type === 'income' && styles.typeTextActive,
            ]}
          >
            Ingreso / Me debe (+)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Currency Selector (Default: Soles PEN) */}
      <Text style={styles.sectionLabel}>Tipo de Moneda</Text>
      <View style={styles.currencySelectorRow}>
        {CURRENCY_OPTIONS.map((curr) => {
          const isSelected = selectedCurrency === curr.code;
          return (
            <TouchableOpacity
              key={curr.code}
              onPress={() => setSelectedCurrency(curr.code)}
              style={[
                styles.currencyOptionBtn,
                isSelected && styles.currencyOptionBtnActive,
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.currencyOptionSymbol,
                  isSelected && styles.currencyOptionSymbolActive,
                ]}
              >
                {curr.symbol.trim()}
              </Text>
              <Text
                style={[
                  styles.currencyOptionText,
                  isSelected && styles.currencyOptionTextActive,
                ]}
              >
                {curr.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <CustomInput
        label={
          type === 'expense' && effectivePercentage < 100
            ? `Monto Total del Gasto (${selectedCurrency})`
            : `Monto (${selectedCurrency})`
        }
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        leftIcon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
      />

      <CustomInput
        label="Concepto o Descripción"
        placeholder={
          type === 'income'
            ? 'Ej. Pago de honorarios, Préstamo por cobrar'
            : 'Ej. Cena compartida, Supermercado semanal'
        }
        value={description}
        onChangeText={setDescription}
        leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
      />

      {/* Personas Involucradas Section (for both Gasto and Ingreso) */}
      <View style={styles.peopleSectionCard}>
        <View style={styles.peopleHeaderRow}>
          <View style={styles.peopleTitleGroup}>
            <View
              style={[
                styles.peopleIconBox,
                {
                  backgroundColor:
                    type === 'income'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(6, 182, 212, 0.15)',
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={type === 'income' ? colors.mint : colors.cyanLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.peopleSectionTitle}>
                PERSONAS INVOLUCRADAS
              </Text>
              <Text style={styles.peopleSectionSubtitle}>
                {type === 'expense'
                  ? 'Se restará (-) en "Debo a [Persona]" al sacar cuenta'
                  : 'Se sumará (+) en "Deuda de [Persona]" al sacar cuenta'}
              </Text>
            </View>
          </View>
          {effectivePeople.length > 0 && (
            <View style={styles.peopleCountBadge}>
              <Text style={styles.peopleCountText}>
                {effectivePeople.length}{' '}
                {effectivePeople.length === 1 ? 'persona' : 'personas'}
              </Text>
            </View>
          )}
        </View>

        {/* Input to add a person */}
        <View style={styles.personInputRow}>
          <View style={styles.personInputWrapper}>
            <Ionicons
              name="person-add-outline"
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.personTextInput}
              placeholder={
                type === 'expense'
                  ? 'Nombre (ej. Juan, María)...'
                  : 'Nombre de quien paga o debe...'
              }
              placeholderTextColor={colors.textMuted}
              value={personInput}
              onChangeText={setPersonInput}
              onSubmitEditing={handleAddPerson}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.addPersonButton,
              !personInput.trim() && styles.addPersonButtonDisabled,
            ]}
            onPress={handleAddPerson}
            disabled={!personInput.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addPersonButtonText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Added People Chips */}
        {involvedPeople.length > 0 && (
          <View style={styles.addedPeopleRow}>
            {involvedPeople.map((person) => (
              <View key={person} style={styles.personChip}>
                <Ionicons
                  name="person"
                  size={12}
                  color={colors.cyanLight}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.personChipText}>{person}</Text>
                <TouchableOpacity
                  onPress={() => handleRemovePerson(person)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={styles.removePersonBtn}
                >
                  <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recent people suggestions */}
        {recentPeople.length > 0 && (
          <View style={styles.recentPeopleContainer}>
            <Text style={styles.recentPeopleLabel}>Recientes:</Text>
            <View style={styles.recentPeopleRow}>
              {recentPeople.map((person) => {
                const isSelected = involvedPeople.some(
                  (p) => p.toLowerCase() === person.toLowerCase()
                );
                return (
                  <TouchableOpacity
                    key={person}
                    onPress={() => handleTogglePerson(person)}
                    style={[
                      styles.recentPersonChip,
                      isSelected && styles.recentPersonChipActive,
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'person-outline'}
                      size={12}
                      color={isSelected ? colors.cyanLight : colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.recentPersonChipText,
                        isSelected && styles.recentPersonChipTextActive,
                      ]}
                    >
                      {person}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Share Percentage Selector (for both Gasto and Ingreso) */}
        <View style={styles.percentageContainer}>
          <View style={styles.percentageDivider} />

          <View style={styles.percentageHeaderRow}>
            <View style={styles.percentageLabelGroup}>
              <Ionicons
                name="pie-chart-outline"
                size={15}
                color={type === 'income' ? colors.mint : colors.cyanLight}
              />
              <Text style={styles.percentageTitle}>
                {type === 'income'
                  ? '% DEL RECIBO QUE ME DEBE / SUMA (+)'
                  : '% QUE ME CORRESPONDE / RESTA (-)'}
              </Text>
            </View>

            <View style={styles.percentageCustomInputWrap}>
              <TextInput
                style={styles.percentageCustomInput}
                value={myPercentage}
                onChangeText={handleCustomPercentageChange}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>
          </View>

          {/* Quick Percentage Presets */}
          <View style={styles.percentagePresetsRow}>
            {PERCENTAGE_PRESETS.map((preset) => {
              const isSelected =
                Math.abs(effectivePercentage - preset.value) < 0.05;
              return (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => handleSelectPercentagePreset(preset.value)}
                  style={[
                    styles.percentagePresetChip,
                    isSelected && styles.percentagePresetChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.percentagePresetText,
                      isSelected && styles.percentagePresetTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Split Breakdown Summary */}
          {parsedTotalAmount > 0 &&
            (effectivePercentage < 100 || effectivePeople.length > 0) && (
              <View style={styles.splitSummaryBox}>
                <View style={styles.splitSummaryRow}>
                  <Text style={styles.splitSummaryLabel}>Monto total recibo:</Text>
                  <Text style={styles.splitSummaryTotalValue}>
                    {currencySymbol}
                    {parsedTotalAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.splitSummaryRow}>
                  <Text style={styles.splitSummaryMyLabel}>
                    {type === 'income'
                      ? effectivePeople.length > 0
                        ? `Suma a Deuda de ${effectivePeople.join(', ')} (${effectivePercentage}%):`
                        : `Monto a registrar (${effectivePercentage}%):`
                      : effectivePeople.length > 0
                      ? `Se resta en Debo a ${effectivePeople.join(', ')} (${effectivePercentage}%):`
                      : `Tu parte (${effectivePercentage}%):`}
                  </Text>
                  <Text
                    style={[
                      styles.splitSummaryMyValue,
                      { color: type === 'income' ? colors.mint : colors.danger },
                    ]}
                  >
                    {type === 'income' ? '+' : '-'}
                    {currencySymbol}
                    {myShareAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
        </View>
      </View>

      {/* Category selector */}
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
    </ModalContainer>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: 14,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  typeExpenseActive: {
    backgroundColor: colors.danger,
  },
  typeIncomeActive: {
    backgroundColor: colors.mint,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  typeTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  currencySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  currencyOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyOptionBtnActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderColor: colors.primaryLight,
  },
  currencyOptionSymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  currencyOptionSymbolActive: {
    color: colors.cyanLight,
  },
  currencyOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currencyOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  peopleSectionCard: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  peopleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  peopleTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  peopleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  peopleSectionTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  peopleSectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  peopleCountBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  peopleCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cyanLight,
  },
  personInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
  },
  personTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  addPersonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  addPersonButtonDisabled: {
    opacity: 0.45,
  },
  addPersonButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addedPeopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderRadius: borderRadius.full,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
  },
  personChipText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: 4,
  },
  removePersonBtn: {
    padding: 2,
  },
  recentPeopleContainer: {
    marginTop: 10,
  },
  recentPeopleLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  recentPeopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentPersonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  recentPersonChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: colors.cyanLight,
  },
  recentPersonChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  recentPersonChipTextActive: {
    color: colors.cyanLight,
    fontWeight: '700',
  },
  percentageContainer: {
    marginTop: 12,
  },
  percentageDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  percentageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  percentageLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  percentageTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  percentageCustomInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cyanLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    height: 32,
    minWidth: 72,
    justifyContent: 'center',
  },
  percentageCustomInput: {
    color: colors.cyanLight,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'right',
    minWidth: 36,
    paddingVertical: 0,
  },
  percentageSymbol: {
    color: colors.cyanLight,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 2,
  },
  percentagePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  percentagePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  percentagePresetChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: colors.cyanLight,
  },
  percentagePresetText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  percentagePresetTextActive: {
    color: colors.cyanLight,
    fontWeight: '700',
  },
  splitSummaryBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    gap: 4,
  },
  splitSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitSummaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  splitSummaryTotalValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  splitSummaryMyLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  splitSummaryMyValue: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '800',
  },
  splitSummaryOthersLabel: {
    fontSize: 11,
    color: colors.cyanLight,
    flex: 1,
    marginRight: 8,
  },
  splitSummaryOthersValue: {
    fontSize: 11,
    color: colors.cyanLight,
    fontWeight: '700',
  },
  incomePersonSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  incomePersonSummaryText: {
    fontSize: 11,
    color: colors.mint,
    flex: 1,
  },
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
    marginBottom: 8,
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
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: colors.cyanLight,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.cyanLight,
    fontWeight: '700',
  },
});
