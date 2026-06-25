import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/quiz_provider.dart';
import '../../../core/theme/app_theme.dart';

class QuizAttemptScreen extends ConsumerStatefulWidget {
  final String quizId;
  final String title;
  final int durationMinutes;

  const QuizAttemptScreen({
    super.key,
    required this.quizId,
    required this.title,
    required this.durationMinutes,
  });

  @override
  ConsumerState<QuizAttemptScreen> createState() => _QuizAttemptScreenState();
}

class _QuizAttemptScreenState extends ConsumerState<QuizAttemptScreen> {
  bool _started = false;
  int _currentQuestionIndex = 0;
  
  // Timer state
  late int _secondsRemaining;
  Timer? _timer;
  
  // Answers state: questionId -> selectedOptionId list
  final Map<String, List<String>> _selectedAnswers = {};

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.durationMinutes * 60;
    Future.microtask(() async {
      final success = await ref.read(quizProvider.notifier).startQuizAttempt(widget.quizId);
      if (success && mounted) {
        setState(() {
          _started = true;
        });
        _startTimer();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        _timer?.cancel();
        _autoSubmit();
      }
    });
  }

  String _formatTime(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Color _getTimerColor() {
    if (_secondsRemaining < 60) {
      return Colors.redAccent; // Under 1 minute
    } else if (_secondsRemaining < 300) {
      return Colors.amber; // Under 5 minutes
    }
    return AppTheme.primary;
  }

  void _autoSubmit() {
    _submitQuiz(isAuto: true);
  }

  Future<void> _submitQuiz({bool isAuto = false}) async {
    final state = ref.read(quizProvider);
    final attemptId = state.activeAttempt?['id'];
    if (attemptId == null) return;

    if (!isAuto) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: AppTheme.surface,
          title: const Text('Submit Quiz', style: TextStyle(color: Colors.white)),
          content: const Text('Are you sure you want to submit your answers?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: const Text('Submit', style: TextStyle(color: AppTheme.background)),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    _timer?.cancel();

    // Map selected options into backend required format: [{ questionId, selectedOptionIds }]
    final List<Map<String, dynamic>> answersList = [];
    _selectedAnswers.forEach((qId, optIds) {
      answersList.add({
        'questionId': qId,
        'selectedOptionIds': optIds,
      });
    });

    final result = await ref.read(quizProvider.notifier).submitQuizAttempt(
          attemptId: attemptId,
          answers: answersList,
        );

    if (result != null && mounted) {
      final score = result['score'] ?? 0;
      final maxScore = result['maxScore'] ?? 0;
      final passed = result['passed'] as bool? ?? false;

      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: AppTheme.surface,
          title: Center(
            child: Icon(
              passed ? LucideIcons.checkCircle2 : LucideIcons.xCircle,
              color: passed ? Colors.green : Colors.redAccent,
              size: 56,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                passed ? 'Congratulations!' : 'Quiz Completed',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 12),
              Text(
                'You scored $score out of $maxScore marks.',
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 4),
              Text(
                passed ? 'You passed the assessment!' : 'You did not meet the passing criteria.',
                style: TextStyle(
                  color: passed ? Colors.green : Colors.redAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            Center(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  context.go('/quizzes');
                },
                child: const Text('Back to Quizzes'),
              ),
            ),
          ],
        ),
      );
    }
  }

  void _onOptionSelected(String questionId, String optionId, bool isMulti) {
    setState(() {
      final currentSelected = _selectedAnswers[questionId] ?? [];
      if (isMulti) {
        if (currentSelected.contains(optionId)) {
          currentSelected.remove(optionId);
        } else {
          currentSelected.add(optionId);
        }
        _selectedAnswers[questionId] = currentSelected;
      } else {
        _selectedAnswers[questionId] = [optionId];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(quizProvider);
    final quiz = state.activeQuiz;

    final bool loading = state.isLoading && !_started;

    return WillPopScope(
      onWillPop: () async {
        if (_started) {
          final exit = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: AppTheme.surface,
              title: const Text('Exit Quiz?', style: TextStyle(color: Colors.white)),
              content: const Text('Exiting will abandon or auto-submit this attempt. Do you wish to proceed?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Stay', style: TextStyle(color: AppTheme.textSecondary)),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Exit'),
                ),
              ],
            ),
          );
          return exit == true;
        }
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          backgroundColor: Colors.transparent,
          elevation: 0,
          actions: [
            if (_started)
              Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getTimerColor().withOpacity(0.1),
                      border: Border.all(color: _getTimerColor()),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.clock, size: 14, color: _getTimerColor()),
                        const SizedBox(width: 6),
                        Text(
                          _formatTime(_secondsRemaining),
                          style: TextStyle(
                            color: _getTimerColor(),
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
        body: loading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                ),
              )
            : state.errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.alertCircle, color: Colors.redAccent, size: 48),
                          const SizedBox(height: 16),
                          Text(
                            state.errorMessage!,
                            style: const TextStyle(color: Colors.white),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () => context.go('/quizzes'),
                            child: const Text('Go Back'),
                          ),
                        ],
                      ),
                    ),
                  )
                : quiz == null
                    ? const Center(child: Text('Quiz Loading...'))
                    : _buildQuizWorkspace(quiz),
      ),
    );
  }

  Widget _buildQuizWorkspace(Map<String, dynamic> quiz) {
    final questions = quiz['questions'] as List<dynamic>? ?? [];
    if (questions.isEmpty) {
      return const Center(child: Text('No questions found in this quiz.'));
    }

    final question = questions[_currentQuestionIndex];
    final qId = question['id'] ?? '';
    final qText = question['questionText'] ?? '';
    final qType = question['questionType'] ?? 'MCQ_SINGLE';
    final options = question['options'] as List<dynamic>? ?? [];
    
    final bool isMulti = qType == 'MCQ_MULTIPLE';
    final List<String> selectedForQ = _selectedAnswers[qId] ?? [];

    return Column(
      children: [
        // Question Number Strip / Indicator grid
        _buildQuestionGrid(questions),
        const Divider(color: AppTheme.border, height: 1),

        // Question display
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Score indicator
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.border,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Q. ${_currentQuestionIndex + 1} of ${questions.length}',
                        style: const TextStyle(fontSize: 10, color: AppTheme.primary, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '(${question['marks']} Marks)',
                      style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Question Text
                Text(
                  qText,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white, height: 1.5),
                ),
                const SizedBox(height: 28),

                // Question options
                Column(
                  children: options.map((opt) {
                    final optId = opt['id'] ?? '';
                    final optText = opt['optionText'] ?? '';
                    final bool isSelected = selectedForQ.contains(optId);

                    return GestureDetector(
                      onTap: () => _onOptionSelected(qId, optId, isMulti),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary.withOpacity(0.06) : AppTheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppTheme.primary : AppTheme.border,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isMulti
                                  ? (isSelected ? LucideIcons.checkSquare : LucideIcons.square)
                                  : (isSelected ? LucideIcons.checkCircle : LucideIcons.circle),
                              color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
                              size: 20,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Text(
                                optText,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),

        // Navigation Footer
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: AppTheme.border)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              OutlinedButton(
                onPressed: _currentQuestionIndex == 0
                    ? null
                    : () {
                        setState(() {
                          _currentQuestionIndex--;
                        });
                      },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  side: const BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Previous', style: TextStyle(color: Colors.white, fontSize: 13)),
              ),
              if (_currentQuestionIndex == questions.length - 1)
                ElevatedButton(
                  onPressed: () => _submitQuiz(),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                  ).copyWith(elevation: ButtonStyleButton.allOrNull(0.0)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryDark]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Submit Quiz', style: TextStyle(color: AppTheme.background, fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                )
              else
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _currentQuestionIndex++;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    backgroundColor: AppTheme.border,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Next Question', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionGrid(List<dynamic> questions) {
    return Container(
      height: 48,
      alignment: Alignment.center,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: questions.length,
        itemBuilder: (context, index) {
          final q = questions[index];
          final qId = q['id'];
          final isAnswered = _selectedAnswers[qId]?.isNotEmpty ?? false;
          final isActive = _currentQuestionIndex == index;

          Color boxColor = AppTheme.surface;
          Color textColor = AppTheme.textSecondary;
          BorderSide border = const BorderSide(color: AppTheme.border);

          if (isActive) {
            border = const BorderSide(color: AppTheme.primary, width: 1.5);
            textColor = Colors.white;
          }
          if (isAnswered) {
            boxColor = AppTheme.primary.withOpacity(0.12);
            textColor = AppTheme.primary;
          }

          return GestureDetector(
            onTap: () {
              setState(() {
                _currentQuestionIndex = index;
              });
            },
            child: Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: boxColor,
                border: Border.fromBorderSide(border),
                shape: BoxShape.circle,
              ),
              child: Text(
                '${index + 1}',
                style: TextStyle(
                  color: textColor,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
