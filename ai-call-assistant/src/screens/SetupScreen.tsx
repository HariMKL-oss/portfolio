import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  COLORS,
  FONT_SIZE,
  SPACING,
  RoleType,
  ROLE_LABELS,
} from '../types';
import {
  saveResume,
  saveJobDescription,
  saveLastRole,
  getResume,
  getJobDescription,
  getLastRole,
  getSettings,
} from '../services/storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';

type SetupScreenProps = NativeStackScreenProps<RootStackParamList, 'Setup'>;

const ROLES: RoleType[] = [
  'software_engineer',
  'frontend_developer',
  'backend_developer',
  'fullstack_developer',
  'devops_engineer',
  'data_engineer',
  'ml_engineer',
  'mobile_developer',
  'cloud_architect',
];

export default function SetupScreen({ navigation }: SetupScreenProps) {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('software_engineer');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      const [savedResume, savedJD, savedRole] = await Promise.all([
        getResume(),
        getJobDescription(),
        getLastRole(),
      ]);
      setResume(savedResume);
      setJobDescription(savedJD);
      setSelectedRole(
        ROLES.includes(savedRole as RoleType)
          ? (savedRole as RoleType)
          : 'software_engineer'
      );
      setIsLoading(false);
    })();
  }, []);

  const handleStartSession = async () => {
    if (!resume.trim()) {
      Alert.alert('Resume Required', 'Please paste your resume to continue.');
      return;
    }
    if (!jobDescription.trim()) {
      Alert.alert(
        'Job Description Required',
        'Please paste the job description to continue.'
      );
      return;
    }

    setIsStarting(true);
    try {
      const settings = await getSettings();
      const hasLLMKey =
        (settings.llmProvider === 'openai' && settings.openaiApiKey) ||
        (settings.llmProvider === 'gemini' && settings.geminiApiKey);
      const hasSTTKey =
        (settings.sttProvider === 'openai_whisper' && settings.openaiApiKey) ||
        (settings.sttProvider === 'deepgram' && settings.deepgramApiKey);

      if (!hasLLMKey || !hasSTTKey) {
        Alert.alert(
          'API Keys Required',
          'Configure the selected speech and answer providers before starting.',
          [
            {
              text: 'Go to Settings',
              onPress: () => navigation.navigate('Settings'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      await Promise.all([
        saveResume(resume.trim()),
        saveJobDescription(jobDescription.trim()),
        saveLastRole(selectedRole),
      ]);

      navigation.navigate('Interview', {
        resume: resume.trim(),
        jobDescription: jobDescription.trim(),
        role: selectedRole,
      });
    } catch {
      Alert.alert('Could Not Start', 'Please try again or reopen the app.');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Interview Copilot</Text>
          <Text style={styles.subtitle}>
            Your AI-powered interview assistant
          </Text>
        </View>

        {/* Role Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎯 Select Your Role</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleChips}
          >
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleChip,
                  selectedRole === role && styles.roleChipActive,
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    selectedRole === role && styles.roleChipTextActive,
                  ]}
                >
                  {ROLE_LABELS[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Resume Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📄 Your Resume</Text>
          <Text style={styles.sectionHint}>
            Paste your full resume text — experience, skills, projects
          </Text>
          <TextInput
            style={styles.textArea}
            value={resume}
            onChangeText={setResume}
            placeholder="Paste your resume here..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            numberOfLines={8}
          />
          {resume.length > 0 && (
            <Text style={styles.charCount}>
              {resume.split(/\s+/).length} words
            </Text>
          )}
        </View>

        {/* JD Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📋 Job Description</Text>
          <Text style={styles.sectionHint}>
            Paste the full job posting — requirements, responsibilities, tech stack
          </Text>
          <TextInput
            style={styles.textArea}
            value={jobDescription}
            onChangeText={setJobDescription}
            placeholder="Paste the job description here..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            numberOfLines={8}
          />
          {jobDescription.length > 0 && (
            <Text style={styles.charCount}>
              {jobDescription.split(/\s+/).length} words
            </Text>
          )}
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            (isStarting || !resume.trim() || !jobDescription.trim()) &&
              styles.startButtonDisabled,
          ]}
          onPress={handleStartSession}
          disabled={isStarting || !resume.trim() || !jobDescription.trim()}
          accessibilityRole="button"
          accessibilityLabel="Start interview session"
          accessibilityState={{
            disabled: isStarting || !resume.trim() || !jobDescription.trim(),
          }}
        >
          <Text style={styles.startButtonText}>
            {isStarting ? 'Starting...' : 'Start Interview Session'}
          </Text>
        </TouchableOpacity>

        {/* Settings Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsLinkText}>⚙️ Configure API Keys</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.hero,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  roleChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleChipActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  roleChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: COLORS.primary,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 22,
  },
  charCount: {
    textAlign: 'right',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  settingsLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  settingsLinkText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
});
