import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  COLORS,
  FONT_SIZE,
  SPACING,
  AppSettings,
  STTProvider,
  LLMProvider,
} from '../types';
import { saveSettings, getSettings } from '../services/storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [settings, setSettings] = useState<AppSettings>({
    openaiApiKey: '',
    deepgramApiKey: '',
    geminiApiKey: '',
    sttProvider: 'openai_whisper',
    llmProvider: 'openai',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getSettings();
      setSettings(saved);
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        ...settings,
        openaiApiKey: settings.openaiApiKey.trim(),
        deepgramApiKey: settings.deepgramApiKey.trim(),
        geminiApiKey: settings.geminiApiKey.trim(),
      });
      Alert.alert('Saved', 'Your settings have been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
    setIsSaving(false);
  };

  const updateSetting = <Key extends keyof AppSettings>(
    key: Key,
    value: AppSettings[Key]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const STT_OPTIONS: { value: STTProvider; label: string; desc: string }[] = [
    {
      value: 'openai_whisper',
      label: 'OpenAI Whisper',
      desc: 'Reliable, uses OpenAI API key',
    },
    {
      value: 'deepgram',
      label: 'Deepgram Nova-2',
      desc: 'Faster (~0.5s), separate API key',
    },
  ];

  const LLM_OPTIONS: { value: LLMProvider; label: string; desc: string }[] = [
    {
      value: 'openai',
      label: 'OpenAI GPT-4o',
      desc: 'Best quality, streaming support',
    },
    {
      value: 'gemini',
      label: 'Google Gemini',
      desc: 'Fast, cost-effective',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Configure your AI providers and API keys
      </Text>

      {/* STT Provider */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🎤 Speech-to-Text Provider</Text>
        <View style={styles.optionsRow}>
          {STT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionCard,
                settings.sttProvider === opt.value && styles.optionCardActive,
              ]}
              onPress={() => updateSetting('sttProvider', opt.value)}
              accessibilityRole="radio"
              accessibilityState={{
                selected: settings.sttProvider === opt.value,
              }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  settings.sttProvider === opt.value &&
                    styles.optionLabelActive,
                ]}
              >
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* LLM Provider */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🧠 AI Answer Provider</Text>
        <View style={styles.optionsRow}>
          {LLM_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionCard,
                settings.llmProvider === opt.value && styles.optionCardActive,
              ]}
              onPress={() => updateSetting('llmProvider', opt.value)}
              accessibilityRole="radio"
              accessibilityState={{
                selected: settings.llmProvider === opt.value,
              }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  settings.llmProvider === opt.value &&
                    styles.optionLabelActive,
                ]}
              >
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* API Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🔑 API Keys</Text>
        <Text style={styles.sectionHint}>
          {Platform.OS === 'web'
            ? 'Browser preview stores keys locally. Use Android or iOS for encrypted storage.'
            : 'Keys are encrypted in your device keychain and never added to session history.'}
        </Text>

        {/* OpenAI Key — always show since it can be used for both STT and LLM */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>OpenAI API Key</Text>
          <TextInput
            style={styles.input}
            value={settings.openaiApiKey}
            onChangeText={(v) => updateSetting('openaiApiKey', v)}
            placeholder="sk-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>
            Used for {[
              settings.sttProvider === 'openai_whisper' && 'Whisper STT',
              settings.llmProvider === 'openai' && 'GPT-4o answers',
            ]
              .filter(Boolean)
              .join(' + ') || 'not currently selected'}
          </Text>
        </View>

        {/* Deepgram Key — show if Deepgram STT selected */}
        {settings.sttProvider === 'deepgram' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Deepgram API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.deepgramApiKey}
              onChangeText={(v) => updateSetting('deepgramApiKey', v)}
              placeholder="Enter Deepgram key..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Get it free at console.deepgram.com
            </Text>
          </View>
        )}

        {/* Gemini Key — show if Gemini LLM selected */}
        {settings.llmProvider === 'gemini' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Google Gemini API Key</Text>
            <TextInput
              style={styles.input}
              value={settings.geminiApiKey}
              onChangeText={(v) => updateSetting('geminiApiKey', v)}
              placeholder="Enter Gemini key..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Get it free at aistudio.google.com
            </Text>
          </View>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel="Save settings"
        accessibilityState={{ disabled: isSaving }}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : '💾 Save Settings'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  optionLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionLabelActive: {
    color: COLORS.primary,
  },
  optionDesc: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  inputGroup: {
    marginTop: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
