import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  COLORS,
  FONT_SIZE,
  SPACING,
  QAPair,
  RecordingState,
  ROLE_LABELS,
  InterviewSession,
  RootStackParamList,
} from '../types';
import { getSettings, saveSession } from '../services/storage';
import {
  configureAudioMode,
  deleteRecording,
  normalizeMetering,
  requestMicPermission,
  resetAudioMode,
  VOICE_RECORDING_OPTIONS,
} from '../services/audioRecorder';
import { transcribeAudio } from '../services/speechToText';
import { generateAnswer } from '../services/aiPromptEngine';

import ToggleButton from '../components/ToggleButton';
import QuestionCard from '../components/QuestionCard';
import AnswerCard from '../components/AnswerCard';
import AudioVisualizer from '../components/AudioVisualizer';

type InterviewScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Interview'
>;

type ProcessingStage = 'transcribing' | 'generating' | null;

export default function InterviewScreen({
  route,
  navigation,
}: InterviewScreenProps) {
  const { resume, jobDescription, role } = route.params;
  const audioRecorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{
    text: string;
    timestamp: number;
  } | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isStreamingAnswer, setIsStreamingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());

  const scrollViewRef = useRef<ScrollView>(null);
  const recordingStartedAt = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const isTransitioning = useRef(false);
  const recordingStateRef = useRef<RecordingState>('idle');
  const qaPairsRef = useRef<QAPair[]>([]);
  const sessionId = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  const updateRecordingState = useCallback((state: RecordingState) => {
    recordingStateRef.current = state;
    if (isMounted.current) setRecordingState(state);
  }, []);

  useEffect(() => {
    (async () => {
      const granted = await requestMicPermission();
      if (!granted && isMounted.current) {
        Alert.alert(
          'Microphone Permission Required',
          'Grant microphone access in device settings to record interview questions.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    })().catch(() => {
      if (isMounted.current) {
        setError('Could not request microphone access. Please check device settings.');
      }
    });
  }, [navigation]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortController.current?.abort();
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => undefined);
      }
      resetAudioMode().catch(() => undefined);
    };
  }, [audioRecorder]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (recordingStateRef.current === 'idle') return;

      event.preventDefault();
      Alert.alert(
        'End active question?',
        'The current recording or request will be cancelled.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: async () => {
              abortController.current?.abort();
              if (audioRecorder.isRecording) {
                await audioRecorder.stop().catch(() => undefined);
                await deleteRecording(audioRecorder.uri);
              }
              await resetAudioMode().catch(() => undefined);
              updateRecordingState('idle');
              navigation.dispatch(event.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [audioRecorder, navigation, updateRecordingState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [qaPairs, currentQuestion, currentAnswer]);

  const handleTogglePress = useCallback(async () => {
    if (isTransitioning.current || recordingStateRef.current === 'processing') {
      return;
    }

    isTransitioning.current = true;
    setError(null);

    if (recordingStateRef.current === 'idle') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await configureAudioMode();
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        recordingStartedAt.current = Date.now();
        setCurrentQuestion(null);
        setCurrentAnswer('');
        setIsStreamingAnswer(false);
        updateRecordingState('recording');
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Unknown error';
        setError(`Could not start recording: ${message}`);
        await resetAudioMode().catch(() => undefined);
      } finally {
        isTransitioning.current = false;
      }
      return;
    }

    let audioUri: string | null = null;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateRecordingState('processing');
      setProcessingStage('transcribing');

      await audioRecorder.stop();
      await resetAudioMode().catch(() => undefined);
      audioUri = audioRecorder.uri;
      const duration = (Date.now() - recordingStartedAt.current) / 1000;

      if (!audioUri) {
        throw new Error('No audio file was created. Please record the question again.');
      }
      if (duration < 0.4) {
        throw new Error('The recording was too short. Hold until the question is finished.');
      }

      const settings = await getSettings();
      const sttKey =
        settings.sttProvider === 'deepgram'
          ? settings.deepgramApiKey
          : settings.openaiApiKey;
      const llmKey =
        settings.llmProvider === 'gemini'
          ? settings.geminiApiKey
          : settings.openaiApiKey;

      const controller = new AbortController();
      abortController.current = controller;

      const question = await transcribeAudio(
        audioUri,
        settings.sttProvider,
        sttKey,
        controller.signal
      );

      if (!question.trim()) {
        throw new Error(
          'No speech was detected. Move closer to the speaker and try again.'
        );
      }

      const questionTimestamp = Date.now();
      setCurrentQuestion({ text: question, timestamp: questionTimestamp });
      setProcessingStage('generating');
      setIsStreamingAnswer(true);

      const fullAnswer = await generateAnswer(
        question,
        role,
        resume,
        jobDescription,
        settings.llmProvider,
        llmKey,
        (partialAnswer) => {
          if (isMounted.current) setCurrentAnswer(partialAnswer);
        },
        controller.signal
      );

      const newQA: QAPair = {
        id: `qa_${Date.now()}`,
        question,
        answer: fullAnswer,
        timestamp: questionTimestamp,
        duration,
      };
      const updatedPairs = [...qaPairsRef.current, newQA];
      qaPairsRef.current = updatedPairs;
      setQaPairs(updatedPairs);

      const session: InterviewSession = {
        id: sessionId.current,
        resume,
        jobDescription,
        role,
        companyName: '',
        qaPairs: updatedPairs,
        startedAt: sessionStartTime,
      };
      await saveSession(session);

      setCurrentQuestion(null);
      setCurrentAnswer('');
      setIsStreamingAnswer(false);
      setProcessingStage(null);
      updateRecordingState('idle');
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
      if (isMounted.current) {
        setError(message);
        setCurrentQuestion(null);
        setCurrentAnswer('');
        setIsStreamingAnswer(false);
        setProcessingStage(null);
        updateRecordingState('idle');
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        ).catch(() => undefined);
      }
    } finally {
      abortController.current = null;
      await deleteRecording(audioUri);
      await resetAudioMode().catch(() => undefined);
      isTransitioning.current = false;
    }
  }, [
    audioRecorder,
    jobDescription,
    resume,
    role,
    sessionStartTime,
    updateRecordingState,
  ]);

  const handleCancelProcessing = () => {
    abortController.current?.abort();
  };

  const handleCopyAnswer = async (text: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const processingLabel =
    processingStage === 'transcribing'
      ? 'Transcribing the question...'
      : 'Generating your answer...';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.topBar}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{ROLE_LABELS[role]}</Text>
        </View>
        <View style={styles.questionCounter}>
          <Text style={styles.counterText}>
            {qaPairs.length} Q{qaPairs.length !== 1 ? 's' : ''} answered
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.qaList}
        contentContainerStyle={styles.qaListContent}
        showsVerticalScrollIndicator={false}
      >
        {qaPairs.length === 0 && recordingState === 'idle' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Ready for your interview</Text>
            <Text style={styles.emptyText}>
              Put the interview on speaker, then tap the button when the question
              starts. Tap again when the question ends.
            </Text>
            <View style={styles.stepsContainer}>
              <Text style={styles.stepText}>1. Tap when the question starts</Text>
              <Text style={styles.stepText}>2. Tap again when it ends</Text>
              <Text style={styles.stepText}>3. Read and personalize the answer</Text>
            </View>
          </View>
        )}

        {qaPairs.map((qa, index) => (
          <View key={qa.id}>
            <QuestionCard
              question={qa.question}
              questionNumber={index + 1}
              timestamp={qa.timestamp}
            />
            <AnswerCard
              answer={qa.answer}
              onCopy={() => handleCopyAnswer(qa.answer)}
            />
            {index < qaPairs.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        {currentQuestion && (
          <QuestionCard
            question={currentQuestion.text}
            questionNumber={qaPairs.length + 1}
            timestamp={currentQuestion.timestamp}
          />
        )}
        {currentAnswer && (
          <AnswerCard
            answer={currentAnswer}
            isStreaming={isStreamingAnswer}
          />
        )}
      </ScrollView>

      {error && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => setError(null)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Text style={styles.errorText}>⚠ {error}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomArea}>
        <AudioVisualizer
          isActive={recordingState === 'recording'}
          level={normalizeMetering(recorderState.metering)}
        />
        <ToggleButton
          state={recordingState}
          onPress={handleTogglePress}
          recordingDuration={Math.floor(recorderState.durationMillis / 1000)}
          processingLabel={processingLabel}
        />
        {recordingState === 'processing' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelProcessing}
            accessibilityRole="button"
            accessibilityLabel="Cancel current request"
          >
            <Text style={styles.cancelButtonText}>Cancel request</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  questionCounter: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  qaList: {
    flex: 1,
  },
  qaListContent: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  stepsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerDim,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  bottomArea: {
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
});
