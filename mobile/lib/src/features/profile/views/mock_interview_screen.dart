import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/api/api_client.dart';
import 'package:dio/dio.dart';

class MockInterviewScreen extends ConsumerStatefulWidget {
  const MockInterviewScreen({super.key});

  @override
  ConsumerState<MockInterviewScreen> createState() => _MockInterviewScreenState();
}

class _MockInterviewScreenState extends ConsumerState<MockInterviewScreen> {
  final _answerController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _result;
  String? _errorMessage;

  // Selected behavioral questions
  final List<String> _questions = [
    'Tell me about a time you solved a complex debugging issue in one of your projects. What steps did you take?',
    'Describe a scenario where you had to work under a tight deadline. How did you organize your tasks?',
    'Tell me about a time when you had a disagreement with a teammate. How did you resolve it and what was the outcome?',
    'Why do you want to work as a Software Developer, and what skills make you a strong candidate?'
  ];

  late String _currentQuestion;

  @override
  void initState() {
    super.initState();
    _currentQuestion = _questions[0];
  }

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  void _shuffleQuestion() {
    setState(() {
      final index = (_questions.indexOf(_currentQuestion) + 1) % _questions.length;
      _currentQuestion = _questions[index];
      _answerController.clear();
      _result = null;
      _errorMessage = null;
    });
  }

  Future<void> _submitForEvaluation() async {
    final answerText = _answerController.text.trim();
    if (answerText.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _result = null;
    });

    try {
      final user = ref.read(authProvider).user;
      final student = user?.student;
      if (student == null) {
        throw Exception('Student profile not found');
      }

      final dio = ref.read(dioProvider);

      final response = await dio.post(
        '/student/${student.id}/mock-interview',
        data: {
          'question': _currentQuestion,
          'answer': answerText,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        setState(() {
          _result = response.data['data'];
        });
      } else {
        throw Exception(response.data['message'] ?? 'Evaluation failed');
      }
    } on DioException catch (e) {
      setState(() {
        _errorMessage = e.response?.data?['message'] ?? e.message ?? 'An error occurred during evaluation.';
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'AI Mock Interview',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Intro instructions (only show if no result)
              if (_result == null) ...[
                const Text(
                  'Practice your communication skills. Speak or type your answers to the behavioral query below, and our AI will grade your response.',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 20),
              ],

              // Question Panel
              Container(
                decoration: AppTheme.glassDecoration(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'INTERVIEW QUESTION',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                        if (_result == null && !_isLoading)
                          IconButton(
                            icon: const Icon(LucideIcons.refreshCw, color: AppTheme.primary, size: 16),
                            onPressed: _shuffleQuestion,
                            tooltip: 'Next Question',
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _currentQuestion,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              if (_result == null) ...[
                // Input workspace
                const Text(
                  'Your Answer:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: TextFormField(
                    controller: _answerController,
                    maxLines: 8,
                    style: const TextStyle(fontSize: 13, color: Colors.white, height: 1.4),
                    decoration: const InputDecoration(
                      hintText: 'Type your answer here... try to describe the Situation, Task, Action, and final Result.',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Submit Button
                ElevatedButton(
                  onPressed: _isLoading || _answerController.text.trim().isEmpty ? null : _submitForEvaluation,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.background),
                          ),
                        )
                      : const Text('Submit for Evaluation'),
                ),
              ] else ...[
                // Evaluation Feedback display
                _buildEvaluationResultPanel(),
              ],

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEvaluationResultPanel() {
    final evaluation = _result!;
    final int score = (evaluation['score'] as num?)?.round() ?? 70;
    final String feedback = evaluation['feedback'] ?? 'Good attempt!';
    final List<dynamic> strengths = evaluation['strengths'] ?? [];
    final List<dynamic> improvements = evaluation['improvements'] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Score Gauge
        Container(
          decoration: AppTheme.glassDecoration(),
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              CircularPercentIndicator(
                radius: 45.0,
                lineWidth: 8.0,
                percent: score / 100.0,
                animation: true,
                animationDuration: 1000,
                circularStrokeCap: CircularStrokeCap.round,
                backgroundColor: AppTheme.border,
                progressColor: score >= 70 ? Colors.green : Colors.amber,
                center: Text(
                  '$score%',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Evaluation Summary',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                feedback,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Strengths Panel
        if (strengths.isNotEmpty) ...[
          const Text(
            'Strengths',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green),
          ),
          const SizedBox(height: 8),
          ...strengths.map((str) {
            return Card(
              color: Colors.green.withOpacity(0.04),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const Icon(LucideIcons.checkCircle, color: Colors.green, size: 16),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        str.toString(),
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 20),
        ],

        // Improvements Panel
        if (improvements.isNotEmpty) ...[
          const Text(
            'Areas to Improve',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.amber),
          ),
          const SizedBox(height: 8),
          ...improvements.map((imp) {
            return Card(
              color: Colors.amber.withOpacity(0.04),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const Icon(LucideIcons.alertTriangle, color: Colors.amber, size: 16),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        imp.toString(),
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 24),
        ],

        // Retake Button
        ElevatedButton(
          onPressed: _shuffleQuestion,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.border,
            side: const BorderSide(color: AppTheme.primary, width: 0.5),
          ),
          child: const Text('Try Another Question', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
