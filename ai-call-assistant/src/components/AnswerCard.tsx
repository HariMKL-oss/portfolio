import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../types';

interface AnswerCardProps {
  answer: string;
  isStreaming?: boolean;
  onCopy?: () => void;
}

/**
 * Displays the AI-generated answer with a green accent.
 * Supports streaming (progressive text reveal) and a copy button.
 */
export default function AnswerCard({
  answer,
  isStreaming = false,
  onCopy,
}: AnswerCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isStreaming) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isStreaming]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>💡 AI ANSWER</Text>
        </View>
        {isStreaming && (
          <Animated.View style={[styles.streamingDot, { opacity: dotAnim }]}>
            <Text style={styles.streamingText}>●</Text>
          </Animated.View>
        )}
        {!isStreaming && onCopy && (
          <TouchableOpacity
            onPress={onCopy}
            style={styles.copyButton}
            accessibilityRole="button"
            accessibilityLabel="Copy answer"
          >
            <Text style={styles.copyText}>📋 Copy</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.answerText}>{answer}</Text>

      {!isStreaming && answer && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ~{Math.ceil(answer.trim().split(/\s+/).length / 2.5)}s to speak
          </Text>
          <Text style={styles.footerText}>
            {answer.trim().split(/\s+/).length} words
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: COLORS.successDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flex: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: COLORS.success,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  streamingDot: {
    marginLeft: SPACING.sm,
  },
  streamingText: {
    color: COLORS.success,
    fontSize: 12,
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  answerText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
});
