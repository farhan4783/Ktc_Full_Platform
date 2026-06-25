import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/quiz_provider.dart';
import '../../../core/theme/app_theme.dart';

class QuizzesScreen extends ConsumerStatefulWidget {
  const QuizzesScreen({super.key});

  @override
  ConsumerState<QuizzesScreen> createState() => _QuizzesScreenState();
}

class _QuizzesScreenState extends ConsumerState<QuizzesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(quizProvider.notifier).fetchQuizzes();
    });
  }

  void _showLeaderboard(String quizId, String quizTitle) {
    ref.read(quizProvider.notifier).fetchLeaderboard(quizId);
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Consumer(
          builder: (context, ref, child) {
            final state = ref.watch(quizProvider);
            return Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '$quizTitle — Leaderboard',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const Divider(color: AppTheme.border),
                  const SizedBox(height: 12),
                  Expanded(
                    child: state.isLoading
                        ? const Center(
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                            ),
                          )
                        : state.leaderboard.isEmpty
                            ? const Center(
                                child: Text('No submissions yet.', style: TextStyle(color: AppTheme.textSecondary)),
                              )
                            : ListView.builder(
                                itemCount: state.leaderboard.length,
                                itemBuilder: (context, index) {
                                  final row = state.leaderboard[index];
                                  final rank = row['rank'] ?? (index + 1);
                                  final name = '${row['firstName']} ${row['lastName']}';
                                  final pct = row['percentage'] as num? ?? 0.0;
                                  final score = row['score'] ?? 0;
                                  final maxScore = row['maxScore'] ?? 0;

                                  // Style top 3 ranks
                                  Color rankColor = AppTheme.textSecondary;
                                  if (rank == 1) rankColor = Colors.amber;
                                  if (rank == 2) rankColor = Colors.grey;
                                  if (rank == 3) rankColor = Colors.brown;

                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    leading: CircleAvatar(
                                      backgroundColor: rankColor.withOpacity(0.1),
                                      child: Text(
                                        '#$rank',
                                        style: TextStyle(color: rankColor, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    title: Text(name, style: const TextStyle(color: Colors.white, fontSize: 14)),
                                    subtitle: Text('Score: $score/$maxScore', style: const TextStyle(fontSize: 11)),
                                    trailing: Text(
                                      '${pct.toInt()}%',
                                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                                    ),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Assessments',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: state.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
              ),
            )
          : state.errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.alertTriangle, color: Colors.redAccent, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        state.errorMessage!,
                        style: const TextStyle(color: Colors.white),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(quizProvider.notifier).fetchQuizzes(),
                        child: const Text('Try Again'),
                      ),
                    ],
                  ),
                )
              : state.quizzes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.clipboardList, color: AppTheme.textSecondary, size: 64),
                          const SizedBox(height: 16),
                          const Text(
                            'No quizzes available.',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Quizzes will appear here when scheduled by your trainer.',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      itemCount: state.quizzes.length,
                      itemBuilder: (context, index) {
                        final quiz = state.quizzes[index];
                        final id = quiz['id'] ?? '';
                        final title = quiz['title'] ?? 'Quiz Title';
                        final desc = quiz['description'] ?? 'No description provided';
                        final duration = quiz['timeLimitMins'] as int? ?? 30;
                        final totalMarks = quiz['totalMarks'] as int? ?? 100;
                        final questionCount = quiz['_count']?['questions'] as int? ?? 0;
                        final attempts = quiz['attempts'] as List<dynamic>? ?? [];

                        // Check if completed or has score
                        final bool hasAttempted = attempts.isNotEmpty;
                        final Map<String, dynamic>? lastAttempt = hasAttempted ? attempts[0] : null;
                        final bool isSubmitted = lastAttempt?['status'] == 'SUBMITTED';
                        final num? percentage = lastAttempt?['percentage'];
                        final bool? passed = lastAttempt?['passed'];

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.border, width: 1),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        title,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(LucideIcons.trophy, color: AppTheme.primary, size: 20),
                                      onPressed: () => _showLeaderboard(id, title),
                                      tooltip: 'View Leaderboard',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  desc,
                                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    _buildInfoChip(LucideIcons.clock, '$duration Mins'),
                                    const SizedBox(width: 12),
                                    _buildInfoChip(LucideIcons.fileQuestion, '$questionCount Qs'),
                                    const SizedBox(width: 12),
                                    _buildInfoChip(LucideIcons.award, '$totalMarks Marks'),
                                  ],
                                ),
                                const SizedBox(height: 20),
                                // Bottom Actions / Attempts indicator
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    if (hasAttempted && isSubmitted) ...[
                                      Row(
                                        children: [
                                          Icon(
                                            passed == true ? LucideIcons.checkCircle : LucideIcons.xCircle,
                                            color: passed == true ? Colors.green : Colors.red,
                                            size: 16,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            passed == true
                                                ? 'Passed (${percentage!.toInt()}%)'
                                                : 'Failed (${percentage!.toInt()}%)',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: passed == true ? Colors.green : Colors.red,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ] else ...[
                                      const Text(
                                        'Not attempted yet',
                                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                      ),
                                    ],
                                    // Action Button
                                    if (hasAttempted && isSubmitted)
                                      ElevatedButton(
                                        onPressed: () => _showLeaderboard(id, title),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppTheme.border,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                        ),
                                        child: const Text('View Leaderboard', style: TextStyle(fontSize: 12)),
                                      )
                                    else
                                      ElevatedButton(
                                        onPressed: () {
                                          context.go(
                                            '/quizzes/attempt/$id',
                                            extra: {
                                              'title': title,
                                              'duration': duration,
                                            },
                                          );
                                        },
                                        style: ElevatedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                        ),
                                        child: const Text('Start Quiz', style: TextStyle(fontSize: 12)),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.textSecondary),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
