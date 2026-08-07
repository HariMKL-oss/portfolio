import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../types';

interface QuestionCardProps {
  question: string;
  questionNumber: number;
  timestamp?: number;
}

/**
 * Displays the transcribed interviewer question in a styled card.
 */
export default function QuestionCard({
  question,
  questionNumber,
  timestamp,
}: QuestionCardProps) {
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Q{questionNumber}</Text>
        </View>
        <Text style={styles.headerLabel}>Interviewer Asked</Text>
        {timestamp && (
          <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
        )}
      </View>
      <Text style={styles.questionText}>{question}</Text>
    </View>
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
    // Subtle left accent border
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  headerLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    flex: 1,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  questionText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
