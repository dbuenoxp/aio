import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalContainer, CustomButton } from '../../../components/common';
import { Transaction, TransactionCategory } from '../../../types';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { ThemePalette, borderRadius, typography } from '../../../theme';

interface PersonAccountModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: string;
  initialPerson?: string | null;
  onSelectTransaction?: (tx: Transaction) => void;
}

const CATEGORY_ICONS: Record<TransactionCategory, keyof typeof Ionicons.glyphMap> = {
  Comida: 'restaurant-outline',
  Servicios: 'wifi-outline',
  Inversión: 'trending-up-outline',
  Transporte: 'car-outline',
  Salario: 'briefcase-outline',
  Educación: 'school-outline',
  Entretenimiento: 'game-controller-outline',
  Salud: 'fitness-outline',
  Otros: 'receipt-outline',
};

interface AccountBreakdownItem {
  tx: Transaction;
  totalAmount: number;
  myPercentage: number;
  myShare: number;
  personPercentage: number;
  personShare: number;
}

export const PersonAccountModal: React.FC<PersonAccountModalProps> = ({
  visible,
  onClose,
  transactions,
  currency,
  initialPerson = null,
  onSelectTransaction,
}) => {
  const { palette: colors } = useThemeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { selectedMonth: storeMonth, selectedYear: storeYear } = useFinanceStore();
  const [customPeriod, setCustomPeriod] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const selectedMonth = customPeriod ? customPeriod.month : storeMonth;
  const selectedYear = customPeriod ? customPeriod.year : storeYear;

  const [onlyCurrentMonth, setOnlyCurrentMonth] = useState(true);
  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Extract all unique people across transactions in the active currency
  const peopleList = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of transactions) {
      if ((tx.currency || 'PEN') !== currency) continue;
      for (const raw of tx.involvedPeople || []) {
        const clean = raw.trim();
        if (clean && !map.has(clean.toLowerCase())) {
          map.set(clean.toLowerCase(), clean);
        }
      }
    }
    return Array.from(map.values());
  }, [transactions, currency]);

  const [manualPerson, setManualPerson] = useState<string>('');

  const selectedPerson = useMemo(() => {
    if (manualPerson && peopleList.includes(manualPerson)) {
      return manualPerson;
    }
    if (initialPerson) {
      const match = peopleList.find(
        (p) => p.toLowerCase() === initialPerson.toLowerCase()
      );
      if (match) return match;
    }
    return peopleList[0] || '';
  }, [manualPerson, initialPerson, peopleList]);

  const setSelectedPerson = (person: string) => {
    setManualPerson(person);
  };

  const currencySymbol =
    currency === 'USD' ? '$' : currency === 'PEN' ? 'S/. ' : '€ ';

  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    'es-ES',
    { month: 'long', year: 'numeric' }
  );
  const formattedMonthLabel =
    monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const goPrevMonth = () => {
    if (selectedMonth === 0) {
      setCustomPeriod({ month: 11, year: selectedYear - 1 });
    } else {
      setCustomPeriod({ month: selectedMonth - 1, year: selectedYear });
    }
  };

  const goNextMonth = () => {
    if (selectedMonth === 11) {
      setCustomPeriod({ month: 0, year: selectedYear + 1 });
    } else {
      setCustomPeriod({ month: selectedMonth + 1, year: selectedYear });
    }
  };

  // Compute account breakdown for selectedPerson (Excel style: Deuda Persona [+] minus Debo a Persona [-])
  const accountSummary = useMemo(() => {
    if (!selectedPerson) {
      return {
        items: [] as AccountBreakdownItem[],
        incomeItems: [] as AccountBreakdownItem[],
        expenseItems: [] as AccountBreakdownItem[],
        personExpenseTotal: 0,
        myExpenseShareTotal: 0,
        sharedBillsGrossTotal: 0,
        personIncomeTotal: 0,
        totalPersonAccount: 0,
      };
    }

    const personLower = selectedPerson.toLowerCase();

    const filteredTxs = transactions.filter((tx) => {
      if ((tx.currency || 'PEN') !== currency) return false;
      const hasPerson = (tx.involvedPeople || []).some(
        (p) => p.trim().toLowerCase() === personLower
      );
      if (!hasPerson) return false;

      if (onlyCurrentMonth) {
        const d = new Date(tx.date);
        return (
          d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
        );
      }
      return true;
    });

    let personExpenseTotal = 0;
    let myExpenseShareTotal = 0;
    let sharedBillsGrossTotal = 0;
    let personIncomeTotal = 0;

    const items: AccountBreakdownItem[] = filteredTxs.map((tx) => {
      const peopleCount = Math.max(1, (tx.involvedPeople || []).length);
      const totalAmount = tx.totalAmount ?? tx.amount;
      const myPercentage = tx.myPercentage ?? 100;

      if (tx.type === 'expense') {
        const myShare = Number((tx.amount / peopleCount).toFixed(2));
        const othersTotal = Math.max(
          0,
          Number((totalAmount - tx.amount).toFixed(2))
        );
        const othersPercent = Math.max(
          0,
          Number((100 - myPercentage).toFixed(2))
        );
        const personShare = Number((othersTotal / peopleCount).toFixed(2));
        const personPercentage = Number(
          (othersPercent / peopleCount).toFixed(2)
        );

        personExpenseTotal += personShare;
        myExpenseShareTotal += myShare;
        sharedBillsGrossTotal += totalAmount;

        return {
          tx,
          totalAmount,
          myPercentage,
          myShare,
          personPercentage,
          personShare: myShare,
        };
      } else {
        // Income / owed to user by this person (Deuda de la persona [+])
        const personShare = Number((tx.amount / peopleCount).toFixed(2));
        const personPercentage = Number((myPercentage / peopleCount).toFixed(2));
        personIncomeTotal += personShare;

        return {
          tx,
          totalAmount,
          myPercentage,
          myShare: personShare,
          personPercentage,
          personShare,
        };
      }
    });

    const incomeItems = items.filter((item) => item.tx.type === 'income');
    const expenseItems = items.filter((item) => item.tx.type === 'expense');

    const totalPersonAccount = Number(
      (personIncomeTotal - myExpenseShareTotal).toFixed(2)
    );

    return {
      items,
      incomeItems,
      expenseItems,
      personExpenseTotal: Number(personExpenseTotal.toFixed(2)),
      myExpenseShareTotal: Number(myExpenseShareTotal.toFixed(2)),
      sharedBillsGrossTotal: Number(sharedBillsGrossTotal.toFixed(2)),
      personIncomeTotal: Number(personIncomeTotal.toFixed(2)),
      totalPersonAccount,
    };
  }, [
    selectedPerson,
    transactions,
    currency,
    onlyCurrentMonth,
    selectedYear,
    selectedMonth,
  ]);

  const firstName = selectedPerson ? selectedPerson.split(' ')[0] : 'Persona';
  const issuerName = user?.name?.trim() || 'Diego Bueno';
  const periodLabel = onlyCurrentMonth ? formattedMonthLabel : 'Historial Completo';
  const issueDateFormatted = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const receiptNumber = useMemo(() => {
    const m = String(selectedMonth + 1).padStart(2, '0');
    return `AIO-${selectedYear}${m}-${String(accountSummary.items.length).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth, accountSummary.items.length]);

  const buildReceiptHtml = () => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const incomeRowsHtml =
      accountSummary.incomeItems.length === 0
        ? `<tr><td colspan="4" class="empty-cell">Sin cargos registrados en este período</td></tr>`
        : accountSummary.incomeItems
            .map((item, idx) => {
              const dStr = new Date(item.tx.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const detailText =
                item.totalAmount !== item.personShare
                  ? `Recibo: ${currencySymbol}${item.totalAmount.toFixed(2)} (${item.myPercentage}%)`
                  : `100% cargo a favor`;
              return `
                <tr>
                  <td class="col-num">${idx + 1}</td>
                  <td>
                    <div class="item-name">${escapeHtml(item.tx.description)}</div>
                    <div class="item-meta">${escapeHtml(item.tx.category)} • ${dStr}</div>
                  </td>
                  <td class="col-detail">${escapeHtml(detailText)}</td>
                  <td class="col-amount positive">+${currencySymbol}${item.personShare.toFixed(2)}</td>
                </tr>
              `;
            })
            .join('');

    const expenseRowsHtml =
      accountSummary.expenseItems.length === 0
        ? `<tr><td colspan="4" class="empty-cell">Sin descuentos aplicados en este período</td></tr>`
        : accountSummary.expenseItems
            .map((item, idx) => {
              const dStr = new Date(item.tx.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const detailText =
                item.myPercentage < 100
                  ? `Recibo: ${currencySymbol}${item.totalAmount.toFixed(2)} (${item.myPercentage}% desc.)`
                  : `100% descuento directo`;
              return `
                <tr>
                  <td class="col-num">${idx + 1}</td>
                  <td>
                    <div class="item-name">${escapeHtml(item.tx.description)}</div>
                    <div class="item-meta">${escapeHtml(item.tx.category)} • ${dStr}</div>
                  </td>
                  <td class="col-detail">${escapeHtml(detailText)}</td>
                  <td class="col-amount negative">-${currencySymbol}${item.myShare.toFixed(2)}</td>
                </tr>
              `;
            })
            .join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Boleta de Cuenta - ${escapeHtml(selectedPerson)}</title>
        <style>
          @page { margin: 16mm; }
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; background: #F8FAFC; color: #0F172A; }
          .receipt-sheet {
            max-width: 680px;
            margin: 0 auto;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
          }
          .top-banner {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
            color: #FFFFFF;
            padding: 24px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .brand-badge {
            display: inline-block;
            background: rgba(34, 211, 238, 0.18);
            border: 1px solid rgba(34, 211, 238, 0.45);
            color: #22D3EE;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.2px;
            padding: 4px 10px;
            border-radius: 999px;
            margin-bottom: 6px;
          }
          .doc-title { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px; }
          .doc-subtitle { font-size: 12px; color: #94A3B8; margin-top: 4px; }
          .doc-meta-box {
            text-align: right;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 10px 14px;
            border-radius: 10px;
          }
          .doc-number { font-size: 12px; font-weight: 800; color: #22D3EE; }
          .doc-date { font-size: 11px; color: #CBD5E1; margin-top: 3px; }
          .body-pad { padding: 24px 28px; }
          .parties-grid {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 20px;
          }
          .party-col { flex: 1; }
          .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.8px; }
          .party-val { font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 3px; }
          .hero-total-box {
            background: linear-gradient(135deg, #EFF6FF 0%, #ECFEFF 100%);
            border: 2px solid #0284C7;
            border-radius: 14px;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .hero-total-label { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0369A1; letter-spacing: 0.8px; }
          .hero-total-note { font-size: 12px; color: #475569; margin-top: 4px; }
          .hero-total-amount { font-size: 30px; font-weight: 900; color: #0F172A; }
          .section-block { margin-bottom: 22px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
          .section-head {
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .section-head.income { background: #ECFDF5; color: #047857; border-bottom: 1px solid #A7F3D0; }
          .section-head.expense { background: #FFF7ED; color: #C2410C; border-bottom: 1px solid #FED7AA; }
          table { width: 100%; border-collapse: collapse; }
          th {
            background: #F8FAFC;
            text-align: left;
            padding: 8px 14px;
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            border-bottom: 1px solid #E2E8F0;
          }
          td { padding: 10px 14px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
          .col-num { width: 34px; font-size: 11px; font-weight: 700; color: #94A3B8; }
          .item-name { font-size: 13px; font-weight: 700; color: #0F172A; }
          .item-meta { font-size: 11px; color: #64748B; margin-top: 2px; }
          .col-detail { font-size: 11px; color: #475569; }
          .col-amount { text-align: right; font-size: 13px; font-weight: 800; white-space: nowrap; }
          .positive { color: #059669; }
          .negative { color: #DC2626; }
          .empty-cell { text-align: center; color: #94A3B8; font-size: 12px; padding: 16px; }
          .subtotal-row td {
            background: #F8FAFC;
            font-size: 13px;
            font-weight: 800;
            border-top: 1px solid #E2E8F0;
            border-bottom: none;
          }
          .final-summary {
            background: #0F172A;
            color: #FFFFFF;
            border-radius: 12px;
            padding: 16px 20px;
            margin-top: 12px;
          }
          .final-row { display: flex; justify-content: space-between; font-size: 13px; color: #CBD5E1; margin-bottom: 6px; }
          .final-net-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #334155;
            padding-top: 10px;
            margin-top: 8px;
          }
          .final-net-label { font-size: 14px; font-weight: 800; color: #22D3EE; text-transform: uppercase; letter-spacing: 0.6px; }
          .final-net-val { font-size: 22px; font-weight: 900; color: #FFFFFF; }
          .footer-note { text-align: center; font-size: 11px; color: #64748B; margin-top: 18px; }
        </style>
      </head>
      <body>
        <div class="receipt-sheet">
          <div class="top-banner">
            <div>
              <div class="brand-badge">AIO • ESTADO DE CUENTA</div>
              <h1 class="doc-title">Boleta de Liquidación Mensual</h1>
              <div class="doc-subtitle">Detalle de conceptos a cobrar y descuentos aplicados</div>
            </div>
            <div class="doc-meta-box">
              <div class="doc-number">N° ${escapeHtml(receiptNumber)}</div>
              <div class="doc-date">Emitido: ${escapeHtml(issueDateFormatted)}</div>
            </div>
          </div>

          <div class="body-pad">
            <div class="parties-grid">
              <div class="party-col">
                <div class="party-label">Titular de la Cuenta</div>
                <div class="party-val">${escapeHtml(selectedPerson)}</div>
              </div>
              <div class="party-col">
                <div class="party-label">Período Liquidado</div>
                <div class="party-val">${escapeHtml(periodLabel)}</div>
              </div>
              <div class="party-col">
                <div class="party-label">Emitido por</div>
                <div class="party-val">${escapeHtml(issuerName)}</div>
              </div>
            </div>

            <div class="hero-total-box">
              <div>
                <div class="hero-total-label">Monto Neto Total a Pagar</div>
                <div class="hero-total-note">
                  Deuda ${escapeHtml(firstName)} (${currencySymbol}${accountSummary.personIncomeTotal.toFixed(2)}) − Descuentos (${currencySymbol}${accountSummary.myExpenseShareTotal.toFixed(2)})
                </div>
              </div>
              <div class="hero-total-amount">
                ${currencySymbol}${accountSummary.totalPersonAccount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            <div class="section-block">
              <div class="section-head income">
                <span>1. Deuda ${escapeHtml(firstName)} (Conceptos que Suman +)</span>
                <span>${accountSummary.incomeItems.length} movs.</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th>Concepto / Categoría</th>
                    <th>Detalle</th>
                    <th style="text-align:right;">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  ${incomeRowsHtml}
                  <tr class="subtotal-row">
                    <td colspan="3">Total Deuda ${escapeHtml(firstName)} (Suma +)</td>
                    <td class="col-amount positive">+${currencySymbol}${accountSummary.personIncomeTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section-block">
              <div class="section-head expense">
                <span>2. Debo a ${escapeHtml(firstName)} (Descuentos que Restan −)</span>
                <span>${accountSummary.expenseItems.length} movs.</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th>Concepto / Categoría</th>
                    <th>Detalle</th>
                    <th style="text-align:right;">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenseRowsHtml}
                  <tr class="subtotal-row">
                    <td colspan="3">Total Debo a ${escapeHtml(firstName)} (Resta −)</td>
                    <td class="col-amount negative">-${currencySymbol}${accountSummary.myExpenseShareTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="final-summary">
              <div class="final-row">
                <span>(+) Total Deuda ${escapeHtml(firstName)}:</span>
                <span>+${currencySymbol}${accountSummary.personIncomeTotal.toFixed(2)}</span>
              </div>
              <div class="final-row">
                <span>(−) Total Debo a ${escapeHtml(firstName)}:</span>
                <span>-${currencySymbol}${accountSummary.myExpenseShareTotal.toFixed(2)}</span>
              </div>
              <div class="final-net-row">
                <span class="final-net-label">Total con Resta (Monto a Pagar)</span>
                <span class="final-net-val">
                  ${currencySymbol}${accountSummary.totalPersonAccount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div class="footer-note">
              Comprobante generado automáticamente desde AIO • All In One (${escapeHtml(issueDateFormatted)})
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const buildPlainTextSummary = () => {
    const incomeLines =
      accountSummary.incomeItems.length === 0
        ? '  • Sin cargos registrados'
        : accountSummary.incomeItems
            .map(
              (item) =>
                `  • ${item.tx.description}: +${currencySymbol}${item.personShare.toFixed(2)}`
            )
            .join('\n');

    const expenseLines =
      accountSummary.expenseItems.length === 0
        ? '  • Sin descuentos registrados'
        : accountSummary.expenseItems
            .map(
              (item) =>
                `  • ${item.tx.description}${
                  item.myPercentage < 100 ? ` (${item.myPercentage}% de ${currencySymbol}${item.totalAmount.toFixed(2)})` : ''
                }: -${currencySymbol}${item.myShare.toFixed(2)}`
            )
            .join('\n');

    return [
      `📄 *BOLETA DE ESTADO DE CUENTA - ${selectedPerson.toUpperCase()}*`,
      `📅 Período: ${periodLabel} | N° ${receiptNumber}`,
      `────────────────────────`,
      `🟢 *1. DEUDA ${firstName.toUpperCase()} (SUMA +)*`,
      incomeLines,
      `*Subtotal Deuda ${firstName}:* +${currencySymbol}${accountSummary.personIncomeTotal.toFixed(2)}`,
      ``,
      `🟠 *2. DEBO A ${firstName.toUpperCase()} (RESTA -)*`,
      expenseLines,
      `*Subtotal Debo a ${firstName}:* -${currencySymbol}${accountSummary.myExpenseShareTotal.toFixed(2)}`,
      `────────────────────────`,
      `✅ *TOTAL CON RESTA A PAGAR: ${currencySymbol}${accountSummary.totalPersonAccount.toFixed(2)}*`,
    ].join('\n');
  };

  const handleExportPdf = async () => {
    if (!selectedPerson) return;
    setExportingPdf(true);
    try {
      const html = buildReceiptHtml();

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Boleta de Cuenta - ${selectedPerson}`,
        });
      } else {
        await Share.share({
          message: buildPlainTextSummary(),
          title: `Boleta de Cuenta - ${selectedPerson}`,
        });
      }
    } catch {
      // Fallback if native module is unavailable in an older prebuilt binary
      try {
        await Share.share({
          message: buildPlainTextSummary(),
          title: `Boleta de Cuenta - ${selectedPerson}`,
        });
      } catch {
        Alert.alert(
          'No se pudo exportar',
          'Ocurrió un problema al generar o compartir el documento.'
        );
      }
    } finally {
      setExportingPdf(false);
    }
  };

  const handleShareText = async () => {
    try {
      await Share.share({
        message: buildPlainTextSummary(),
        title: `Boleta de Cuenta - ${selectedPerson}`,
      });
    } catch {
      // user cancelled or unavailable
    }
  };

  return (
    <>
      <ModalContainer
        visible={visible}
        onClose={onClose}
        title="Sacar Cuenta por Persona"
        subtitle="Resumen mensual de gastos compartidos e ingresos por persona"
        footer={
          <View style={styles.footerButtonsRow}>
            {selectedPerson && accountSummary.items.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setReceiptPreviewVisible(true)}
                style={styles.emitReceiptBtn}
              >
                <LinearGradient
                  colors={['#059669', '#0D9488']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emitReceiptGradient}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emitReceiptBtnText}>Emitir Cuenta</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Cerrar"
                onPress={onClose}
                variant="primary"
              />
            </View>
          </View>
        }
      >
        {peopleList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              Aún no hay personas registradas
            </Text>
            <Text style={styles.emptySubtitle}>
              Agrega personas involucradas al crear un ingreso o gasto compartido
              para sacar su cuenta del mes.
            </Text>
          </View>
        ) : (
          <>
            {/* Person Selector */}
            <Text style={styles.sectionLabel}>Selecciona a la Persona</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personPillsRow}
            >
              {peopleList.map((person) => {
                const isSelected =
                  person.toLowerCase() === selectedPerson.toLowerCase();
                return (
                  <TouchableOpacity
                    key={person}
                    onPress={() => setSelectedPerson(person)}
                    style={[
                      styles.personPill,
                      isSelected && styles.personPillActive,
                    ]}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.personAvatarSmall,
                        isSelected && styles.personAvatarSmallActive,
                      ]}
                    >
                      <Text style={styles.personAvatarSmallText}>
                        {person.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.personPillText,
                        isSelected && styles.personPillTextActive,
                      ]}
                    >
                      {person}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Period / Month Selector */}
            <View style={styles.periodBar}>
              <View style={styles.periodToggleGroup}>
                <TouchableOpacity
                  onPress={() => setOnlyCurrentMonth(true)}
                  style={[
                    styles.periodTab,
                    onlyCurrentMonth && styles.periodTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      onlyCurrentMonth && styles.periodTabTextActive,
                    ]}
                  >
                    Por Mes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOnlyCurrentMonth(false)}
                  style={[
                    styles.periodTab,
                    !onlyCurrentMonth && styles.periodTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      !onlyCurrentMonth && styles.periodTabTextActive,
                    ]}
                  >
                    Todo
                  </Text>
                </TouchableOpacity>
              </View>

              {onlyCurrentMonth && (
                <View style={styles.monthNavigator}>
                  <TouchableOpacity
                    onPress={goPrevMonth}
                    style={styles.monthNavBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={colors.cyanLight}
                    />
                  </TouchableOpacity>
                  <Text style={styles.monthNavLabel}>{formattedMonthLabel}</Text>
                  <TouchableOpacity
                    onPress={goNextMonth}
                    style={styles.monthNavBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.cyanLight}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Hero Account Summary Card for Selected Person */}
            <LinearGradient
              colors={colors.gradients.financeHero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryHeroCard}
            >
              <View style={styles.summaryHeroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryHeroCaption}>
                    CUENTA DE {selectedPerson.toUpperCase()}
                  </Text>
                  <Text style={styles.summaryHeroPeriod}>{periodLabel}</Text>
                </View>
                <View style={styles.txCountBadge}>
                  <Text style={styles.txCountText}>
                    {accountSummary.items.length}{' '}
                    {accountSummary.items.length === 1
                      ? 'movimiento'
                      : 'movimientos'}
                  </Text>
                </View>
              </View>

              <Text style={styles.summaryHeroTotalLabel}>
                Total con resta (Neto a pagar por {firstName}):
              </Text>
              <Text style={styles.summaryHeroTotalAmount}>
                {currencySymbol}
                {accountSummary.totalPersonAccount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>

              <View style={styles.summaryMetricsGrid}>
                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricLabel}>
                    Deuda {firstName} (Suma +)
                  </Text>
                  <Text
                    style={[
                      styles.summaryMetricValue,
                      { color: colors.mint },
                    ]}
                  >
                    +{currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryMetricDivider} />

                <View style={styles.summaryMetricBox}>
                  <Text style={styles.summaryMetricLabel}>
                    Debo a {firstName} (Resta -)
                  </Text>
                  <Text
                    style={[styles.summaryMetricValue, { color: colors.danger }]}
                  >
                    -{currencySymbol}
                    {accountSummary.myExpenseShareTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryFooterTotals}>
                <View style={styles.summaryFooterRow}>
                  <Text style={styles.summaryFooterText}>
                    Cálculo (Deuda {firstName} − Debo a {firstName}):
                  </Text>
                  <Text style={[styles.summaryFooterVal, { color: colors.cyanLight }]}>
                    {currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)} − {currencySymbol}
                    {accountSummary.myExpenseShareTotal.toFixed(2)} = {currencySymbol}
                    {accountSummary.totalPersonAccount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Redesigned Clean Statement Breakdown Tables */}
            {accountSummary.items.length === 0 ? (
              <View style={styles.emptyMonthBox}>
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyMonthText}>
                  No hay movimientos con {selectedPerson} en este período.
                </Text>
              </View>
            ) : (
              <View style={styles.statementContainer}>
                {/* SECTION 1: DEUDA PERSONA (SUMA +) */}
                <View style={styles.statementCard}>
                  <View style={styles.statementCardHeaderIncome}>
                    <View style={styles.statementHeaderLeft}>
                      <View style={styles.statementHeaderIconIncome}>
                        <Ionicons
                          name="add-circle"
                          size={18}
                          color={colors.mint}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.statementHeaderTitle,
                            { color: colors.mint },
                          ]}
                        >
                          Deuda {firstName} (Suma +)
                        </Text>
                        <Text style={styles.statementHeaderSubtitle}>
                          Conceptos que te debe / suman a la cuenta
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statementCountPillIncome}>
                      <Text
                        style={[
                          styles.statementCountPillText,
                          { color: colors.mint },
                        ]}
                      >
                        {accountSummary.incomeItems.length}{' '}
                        {accountSummary.incomeItems.length === 1 ? 'mov.' : 'movs.'}
                      </Text>
                    </View>
                  </View>

                  {accountSummary.incomeItems.length === 0 ? (
                    <View style={styles.statementEmptyBox}>
                      <Text style={styles.statementEmptyText}>
                        Sin cargos registrados a tu favor en este período
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statementRowsWrapper}>
                      {accountSummary.incomeItems.map((item, idx) => {
                        const dStr = new Date(item.tx.date).toLocaleDateString(
                          'es-ES',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        );
                        const catIcon =
                          CATEGORY_ICONS[item.tx.category] || 'receipt-outline';
                        const isLast =
                          idx === accountSummary.incomeItems.length - 1;

                        return (
                          <TouchableOpacity
                            key={item.tx.id}
                            style={[
                              styles.statementRow,
                              !isLast && styles.statementRowBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              if (onSelectTransaction) {
                                onClose();
                                onSelectTransaction(item.tx);
                              }
                            }}
                          >
                            <View style={styles.rowCategoryIconIncome}>
                              <Ionicons
                                name={catIcon}
                                size={17}
                                color={colors.mint}
                              />
                            </View>

                            <View style={styles.rowMainInfo}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {item.tx.description}
                              </Text>
                              <Text style={styles.rowMetaText} numberOfLines={1}>
                                {item.tx.category} • {dStr}
                                {item.totalAmount !== item.personShare
                                  ? ` • ${item.myPercentage}% de ${currencySymbol}${item.totalAmount.toFixed(2)}`
                                  : ''}
                              </Text>
                            </View>

                            <View style={styles.rowAmountPillIncome}>
                              <Text
                                style={[
                                  styles.rowAmountText,
                                  { color: colors.mint },
                                ]}
                              >
                                +{currencySymbol}
                                {item.personShare.toFixed(2)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.statementSubtotalBarIncome}>
                    <Text style={styles.statementSubtotalLabel}>
                      Total Deuda {firstName}
                    </Text>
                    <Text
                      style={[
                        styles.statementSubtotalAmount,
                        { color: colors.mint },
                      ]}
                    >
                      +{currencySymbol}
                      {accountSummary.personIncomeTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* SECTION 2: DEBO A PERSONA (RESTA -) */}
                <View style={styles.statementCard}>
                  <View style={styles.statementCardHeaderExpense}>
                    <View style={styles.statementHeaderLeft}>
                      <View style={styles.statementHeaderIconExpense}>
                        <Ionicons
                          name="remove-circle"
                          size={18}
                          color={colors.danger}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.statementHeaderTitle,
                            { color: colors.danger },
                          ]}
                        >
                          Debo a {firstName} (Resta −)
                        </Text>
                        <Text style={styles.statementHeaderSubtitle}>
                          Descuentos a tu cargo que se restan
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statementCountPillExpense}>
                      <Text
                        style={[
                          styles.statementCountPillText,
                          { color: colors.danger },
                        ]}
                      >
                        {accountSummary.expenseItems.length}{' '}
                        {accountSummary.expenseItems.length === 1 ? 'mov.' : 'movs.'}
                      </Text>
                    </View>
                  </View>

                  {accountSummary.expenseItems.length === 0 ? (
                    <View style={styles.statementEmptyBox}>
                      <Text style={styles.statementEmptyText}>
                        Sin montos por descontar registrados en este período
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statementRowsWrapper}>
                      {accountSummary.expenseItems.map((item, idx) => {
                        const dStr = new Date(item.tx.date).toLocaleDateString(
                          'es-ES',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        );
                        const catIcon =
                          CATEGORY_ICONS[item.tx.category] || 'receipt-outline';
                        const isLast =
                          idx === accountSummary.expenseItems.length - 1;

                        return (
                          <TouchableOpacity
                            key={item.tx.id}
                            style={[
                              styles.statementRow,
                              !isLast && styles.statementRowBorder,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              if (onSelectTransaction) {
                                onClose();
                                onSelectTransaction(item.tx);
                              }
                            }}
                          >
                            <View style={styles.rowCategoryIconExpense}>
                              <Ionicons
                                name={catIcon}
                                size={17}
                                color={colors.danger}
                              />
                            </View>

                            <View style={styles.rowMainInfo}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {item.tx.description}
                              </Text>
                              <Text style={styles.rowMetaText} numberOfLines={1}>
                                {item.tx.category} • {dStr} •{' '}
                                {item.myPercentage < 100
                                  ? `${item.myPercentage}% de ${currencySymbol}${item.totalAmount.toFixed(2)}`
                                  : `100% descuento`}
                              </Text>
                            </View>

                            <View style={styles.rowAmountPillExpense}>
                              <Text
                                style={[
                                  styles.rowAmountText,
                                  { color: colors.danger },
                                ]}
                              >
                                -{currencySymbol}
                                {item.myShare.toFixed(2)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.statementSubtotalBarExpense}>
                    <Text style={styles.statementSubtotalLabel}>
                      Total Debo a {firstName}
                    </Text>
                    <Text
                      style={[
                        styles.statementSubtotalAmount,
                        { color: colors.danger },
                      ]}
                    >
                      -{currencySymbol}
                      {accountSummary.myExpenseShareTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* FINAL NET SETTLEMENT CARD */}
                <LinearGradient
                  colors={
                    colors.isDark
                      ? ['rgba(6, 182, 212, 0.18)', 'rgba(79, 70, 229, 0.18)']
                      : ['rgba(29, 78, 216, 0.09)', 'rgba(6, 182, 212, 0.14)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.netSettlementCard}
                >
                  <View style={styles.netSettlementLeft}>
                    <Text style={styles.netSettlementTitle}>
                      TOTAL CON RESTA
                    </Text>
                    <Text style={styles.netSettlementFormula}>
                      {currencySymbol}
                      {accountSummary.personIncomeTotal.toFixed(2)} −{' '}
                      {currencySymbol}
                      {accountSummary.myExpenseShareTotal.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.netSettlementValue}>
                    {currencySymbol}
                    {accountSummary.totalPersonAccount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </>
        )}
      </ModalContainer>

      {/* FULL RECEIPT / BOLETA PREVIEW & PDF SHARE MODAL */}
      <Modal
        visible={receiptPreviewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptPreviewVisible(false)}
      >
        <View
          style={[
            styles.boletaBackdrop,
            {
              paddingTop: Math.max(insets.top + 8, 20),
              paddingBottom: Math.max(insets.bottom + 12, 20),
            },
          ]}
        >
          {/* Top Action Header */}
          <View style={styles.boletaTopBar}>
            <View>
              <Text style={styles.boletaTopBarTitle}>
                Vista Previa de Boleta
              </Text>
              <Text style={styles.boletaTopBarSub}>
                Lista para exportar en PDF o compartir con {firstName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReceiptPreviewVisible(false)}
              style={styles.boletaCloseIconBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={20} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          {/* Paper Receipt / Ticket Scrollable Sheet */}
          <ScrollView
            style={styles.boletaScroll}
            contentContainerStyle={styles.boletaScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.paperTicket}>
              {/* Ticket Header Banner */}
              <LinearGradient
                colors={['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.paperHeader}
              >
                <View style={styles.paperHeaderTopRow}>
                  <View style={styles.paperBrandBadge}>
                    <Text style={styles.paperBrandBadgeText}>
                      AIO • BOLETA DE CUENTA
                    </Text>
                  </View>
                  <Text style={styles.paperReceiptNum}>{receiptNumber}</Text>
                </View>

                <Text style={styles.paperDocTitle}>
                  Liquidación Mensual de Cuenta
                </Text>
                <Text style={styles.paperDocDate}>
                  Emitido el {issueDateFormatted}
                </Text>
              </LinearGradient>

              {/* Parties Metadata Strip */}
              <View style={styles.paperPartiesBox}>
                <View style={styles.paperPartyCol}>
                  <Text style={styles.paperPartyLabel}>TITULAR DE CUENTA</Text>
                  <Text style={styles.paperPartyValue}>{selectedPerson}</Text>
                </View>
                <View style={styles.paperPartyDivider} />
                <View style={styles.paperPartyCol}>
                  <Text style={styles.paperPartyLabel}>PERÍODO</Text>
                  <Text style={styles.paperPartyValue}>{periodLabel}</Text>
                </View>
              </View>

              {/* Big Amount Due Box */}
              <View style={styles.paperAmountDueBox}>
                <Text style={styles.paperAmountDueLabel}>
                  MONTO NETO TOTAL A PAGAR
                </Text>
                <Text style={styles.paperAmountDueValue}>
                  {currencySymbol}
                  {accountSummary.totalPersonAccount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View style={styles.paperAmountDueEquationPill}>
                  <Text style={styles.paperAmountDueEquationText}>
                    Deuda {firstName} ({currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)}) − Debo a{' '}
                    {firstName} ({currencySymbol}
                    {accountSummary.myExpenseShareTotal.toFixed(2)})
                  </Text>
                </View>
              </View>

              {/* Section 1: Deuda Persona (+) */}
              <View style={styles.paperSection}>
                <View style={styles.paperSectionHeaderIncome}>
                  <Text style={styles.paperSectionHeaderIncomeTitle}>
                    1. DEUDA {firstName.toUpperCase()} (SUMA +)
                  </Text>
                  <Text style={styles.paperSectionHeaderIncomeCount}>
                    {accountSummary.incomeItems.length} movs.
                  </Text>
                </View>

                {accountSummary.incomeItems.length === 0 ? (
                  <Text style={styles.paperEmptyText}>
                    Sin cargos registrados
                  </Text>
                ) : (
                  accountSummary.incomeItems.map((item, index) => {
                    const dStr = new Date(item.tx.date).toLocaleDateString(
                      'es-ES',
                      { day: '2-digit', month: 'short' }
                    );
                    return (
                      <View key={item.tx.id} style={styles.paperItemRow}>
                        <Text style={styles.paperItemIndex}>{index + 1}.</Text>
                        <View style={styles.paperItemCenter}>
                          <Text style={styles.paperItemTitle}>
                            {item.tx.description}
                          </Text>
                          <Text style={styles.paperItemSub}>
                            {item.tx.category} • {dStr}
                            {item.totalAmount !== item.personShare
                              ? ` (${item.myPercentage}% de ${currencySymbol}${item.totalAmount.toFixed(2)})`
                              : ''}
                          </Text>
                        </View>
                        <Text style={styles.paperItemAmountPositive}>
                          +{currencySymbol}
                          {item.personShare.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })
                )}

                <View style={styles.paperSubtotalRowIncome}>
                  <Text style={styles.paperSubtotalLabel}>
                    Subtotal Deuda {firstName}
                  </Text>
                  <Text style={styles.paperSubtotalValuePositive}>
                    +{currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Section 2: Debo a Persona (-) */}
              <View style={styles.paperSection}>
                <View style={styles.paperSectionHeaderExpense}>
                  <Text style={styles.paperSectionHeaderExpenseTitle}>
                    2. DEBO A {firstName.toUpperCase()} (RESTA −)
                  </Text>
                  <Text style={styles.paperSectionHeaderExpenseCount}>
                    {accountSummary.expenseItems.length} movs.
                  </Text>
                </View>

                {accountSummary.expenseItems.length === 0 ? (
                  <Text style={styles.paperEmptyText}>
                    Sin descuentos registrados
                  </Text>
                ) : (
                  accountSummary.expenseItems.map((item, index) => {
                    const dStr = new Date(item.tx.date).toLocaleDateString(
                      'es-ES',
                      { day: '2-digit', month: 'short' }
                    );
                    return (
                      <View key={item.tx.id} style={styles.paperItemRow}>
                        <Text style={styles.paperItemIndex}>{index + 1}.</Text>
                        <View style={styles.paperItemCenter}>
                          <Text style={styles.paperItemTitle}>
                            {item.tx.description}
                          </Text>
                          <Text style={styles.paperItemSub}>
                            {item.tx.category} • {dStr} •{' '}
                            {item.myPercentage < 100
                              ? `${item.myPercentage}% de ${currencySymbol}${item.totalAmount.toFixed(2)}`
                              : '100% descuento'}
                          </Text>
                        </View>
                        <Text style={styles.paperItemAmountNegative}>
                          -{currencySymbol}
                          {item.myShare.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })
                )}

                <View style={styles.paperSubtotalRowExpense}>
                  <Text style={styles.paperSubtotalLabel}>
                    Subtotal Debo a {firstName}
                  </Text>
                  <Text style={styles.paperSubtotalValueNegative}>
                    -{currencySymbol}
                    {accountSummary.myExpenseShareTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Ticket Footer Final Summary */}
              <View style={styles.paperFooterSummary}>
                <View style={styles.paperFooterLine}>
                  <Text style={styles.paperFooterLineLabel}>
                    (+) Total Deuda {firstName}:
                  </Text>
                  <Text style={styles.paperFooterLineVal}>
                    +{currencySymbol}
                    {accountSummary.personIncomeTotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.paperFooterLine}>
                  <Text style={styles.paperFooterLineLabel}>
                    (−) Total Debo a {firstName}:
                  </Text>
                  <Text style={styles.paperFooterLineVal}>
                    -{currencySymbol}
                    {accountSummary.myExpenseShareTotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.paperFooterNetRow}>
                  <Text style={styles.paperFooterNetLabel}>
                    TOTAL CON RESTA A PAGAR
                  </Text>
                  <Text style={styles.paperFooterNetValue}>
                    {currencySymbol}
                    {accountSummary.totalPersonAccount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>

              <Text style={styles.paperStampText}>
                Emitido por {issuerName} • AIO Finance Hub
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Export / Share Action Bar */}
          <View style={styles.boletaBottomBar}>
            <TouchableOpacity
              onPress={handleShareText}
              style={styles.boletaSecondaryBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#F8FAFC" />
              <Text style={styles.boletaSecondaryBtnText}>Texto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportPdf}
              disabled={exportingPdf}
              style={styles.boletaPrimaryPdfBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2563EB', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boletaPrimaryPdfGradient}
              >
                <Ionicons name="print-outline" size={19} color="#FFFFFF" />
                <Text style={styles.boletaPrimaryPdfText}>
                  {exportingPdf
                    ? 'Generando PDF...'
                    : 'Compartir / Guardar PDF'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    emptyTitle: {
      ...typography.body,
      fontWeight: '700',
      marginTop: 12,
      color: colors.textPrimary,
    },
    emptySubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    personPillsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 14,
    },
    personPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    personPillActive: {
      backgroundColor: 'rgba(6, 182, 212, 0.2)',
      borderColor: colors.cyanLight,
    },
    personAvatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personAvatarSmallActive: {
      backgroundColor: colors.primary,
    },
    personAvatarSmallText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFF',
    },
    personPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    personPillTextActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
    periodBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      gap: 8,
    },
    periodToggleGroup: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 3,
    },
    periodTab: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
    },
    periodTabActive: {
      backgroundColor: colors.primary,
    },
    periodTabText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    periodTabTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    monthNavigator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    monthNavBtn: {
      padding: 2,
    },
    monthNavLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      minWidth: 105,
      textAlign: 'center',
    },
    summaryHeroCard: {
      borderRadius: borderRadius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    summaryHeroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    summaryHeroCaption: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.cyanLight,
      letterSpacing: 0.8,
    },
    summaryHeroPeriod: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    txCountBadge: {
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    txCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.cyanLight,
    },
    summaryHeroTotalLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    summaryHeroTotalAmount: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 2,
      marginBottom: 14,
    },
    summaryMetricsGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryMetricBox: {
      flex: 1,
    },
    summaryMetricDivider: {
      width: 1,
      height: 30,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },
    summaryMetricLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    summaryMetricValue: {
      fontSize: 16,
      fontWeight: '800',
    },
    summaryFooterTotals: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: 4,
    },
    summaryFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    summaryFooterText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    summaryFooterVal: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyMonthBox: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
    },
    emptyMonthText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },
    /* Redesigned Clean Statement Breakdown Styles */
    statementContainer: {
      gap: 14,
    },
    statementCard: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    statementCardHeaderIncome: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: 'rgba(16, 185, 129, 0.10)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(16, 185, 129, 0.22)',
    },
    statementCardHeaderExpense: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.09)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(239, 68, 68, 0.22)',
    },
    statementHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    statementHeaderIconIncome: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statementHeaderIconExpense: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statementHeaderTitle: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    statementHeaderSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    statementCountPillIncome: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.32)',
    },
    statementCountPillExpense: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.32)',
    },
    statementCountPillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    statementEmptyBox: {
      paddingVertical: 18,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    statementEmptyText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statementRowsWrapper: {
      paddingHorizontal: 14,
    },
    statementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 11,
    },
    statementRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    rowCategoryIconIncome: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowCategoryIconExpense: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowMainInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    rowMetaText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rowAmountPillIncome: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    rowAmountPillExpense: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    rowAmountText: {
      fontSize: 14,
      fontWeight: '800',
    },
    statementSubtotalBarIncome: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.surfaceLight,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statementSubtotalBarExpense: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.surfaceLight,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statementSubtotalLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    statementSubtotalAmount: {
      fontSize: 15,
      fontWeight: '900',
    },
    netSettlementCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.cyanLight,
    },
    netSettlementLeft: {
      flex: 1,
      marginRight: 10,
    },
    netSettlementTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.6,
    },
    netSettlementFormula: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    netSettlementValue: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.cyanLight,
    },
    /* Footer Buttons Row */
    footerButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    emitReceiptBtn: {
      flex: 1.15,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    emitReceiptGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: borderRadius.md,
    },
    emitReceiptBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    /* Full Screen Boleta / Receipt Preview Modal */
    boletaBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(7, 10, 19, 0.92)',
      paddingHorizontal: 16,
    },
    boletaTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    boletaTopBarTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#F8FAFC',
    },
    boletaTopBarSub: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2,
    },
    boletaCloseIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    boletaScroll: {
      flex: 1,
    },
    boletaScrollContent: {
      paddingBottom: 16,
    },
    paperTicket: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#CBD5E1',
    },
    paperHeader: {
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    paperHeaderTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    paperBrandBadge: {
      backgroundColor: 'rgba(34, 211, 238, 0.18)',
      borderWidth: 1,
      borderColor: 'rgba(34, 211, 238, 0.4)',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
    },
    paperBrandBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#22D3EE',
      letterSpacing: 0.8,
    },
    paperReceiptNum: {
      fontSize: 11,
      fontWeight: '700',
      color: '#94A3B8',
    },
    paperDocTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    paperDocDate: {
      fontSize: 11,
      color: '#CBD5E1',
      marginTop: 2,
    },
    paperPartiesBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    paperPartyCol: {
      flex: 1,
    },
    paperPartyDivider: {
      width: 1,
      height: 28,
      backgroundColor: '#CBD5E1',
      marginHorizontal: 12,
    },
    paperPartyLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: '#64748B',
      letterSpacing: 0.7,
    },
    paperPartyValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
      marginTop: 2,
    },
    paperAmountDueBox: {
      margin: 16,
      padding: 16,
      borderRadius: 14,
      backgroundColor: '#F0F9FF',
      borderWidth: 1.5,
      borderColor: '#0284C7',
      alignItems: 'center',
    },
    paperAmountDueLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0369A1',
      letterSpacing: 0.8,
    },
    paperAmountDueValue: {
      fontSize: 30,
      fontWeight: '900',
      color: '#0F172A',
      marginVertical: 4,
    },
    paperAmountDueEquationPill: {
      backgroundColor: '#E0F2FE',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 2,
    },
    paperAmountDueEquationText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0369A1',
    },
    paperSection: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      overflow: 'hidden',
    },
    paperSectionHeaderIncome: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#ECFDF5',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#A7F3D0',
    },
    paperSectionHeaderIncomeTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#047857',
      letterSpacing: 0.4,
    },
    paperSectionHeaderIncomeCount: {
      fontSize: 10,
      fontWeight: '700',
      color: '#047857',
    },
    paperSectionHeaderExpense: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFF7ED',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#FED7AA',
    },
    paperSectionHeaderExpenseTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#C2410C',
      letterSpacing: 0.4,
    },
    paperSectionHeaderExpenseCount: {
      fontSize: 10,
      fontWeight: '700',
      color: '#C2410C',
    },
    paperEmptyText: {
      fontSize: 11,
      color: '#94A3B8',
      textAlign: 'center',
      paddingVertical: 12,
    },
    paperItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    paperItemIndex: {
      width: 22,
      fontSize: 11,
      fontWeight: '700',
      color: '#94A3B8',
    },
    paperItemCenter: {
      flex: 1,
      marginRight: 8,
    },
    paperItemTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0F172A',
    },
    paperItemSub: {
      fontSize: 10,
      color: '#64748B',
      marginTop: 1,
    },
    paperItemAmountPositive: {
      fontSize: 13,
      fontWeight: '800',
      color: '#059669',
    },
    paperItemAmountNegative: {
      fontSize: 13,
      fontWeight: '800',
      color: '#DC2626',
    },
    paperSubtotalRowIncome: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    paperSubtotalRowExpense: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    paperSubtotalLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#334155',
    },
    paperSubtotalValuePositive: {
      fontSize: 13,
      fontWeight: '900',
      color: '#059669',
    },
    paperSubtotalValueNegative: {
      fontSize: 13,
      fontWeight: '900',
      color: '#DC2626',
    },
    paperFooterSummary: {
      marginHorizontal: 16,
      marginTop: 2,
      marginBottom: 12,
      backgroundColor: '#0F172A',
      borderRadius: 12,
      padding: 14,
    },
    paperFooterLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    paperFooterLineLabel: {
      fontSize: 11,
      color: '#CBD5E1',
    },
    paperFooterLineVal: {
      fontSize: 11,
      fontWeight: '700',
      color: '#F8FAFC',
    },
    paperFooterNetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#334155',
      paddingTop: 8,
      marginTop: 6,
    },
    paperFooterNetLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#22D3EE',
    },
    paperFooterNetValue: {
      fontSize: 18,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    paperStampText: {
      textAlign: 'center',
      fontSize: 10,
      color: '#64748B',
      marginBottom: 14,
    },
    boletaBottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 10,
    },
    boletaSecondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    boletaSecondaryBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#F8FAFC',
    },
    boletaPrimaryPdfBtn: {
      flex: 1,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    boletaPrimaryPdfGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: borderRadius.md,
    },
    boletaPrimaryPdfText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
