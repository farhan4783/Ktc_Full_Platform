import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/database/offline_database.dart';

class QuizState {
  final bool isLoading;
  final List<dynamic> quizzes;
  final Map<String, dynamic>? activeQuiz;
  final Map<String, dynamic>? activeAttempt;
  final List<dynamic> leaderboard;
  final String? errorMessage;

  QuizState({
    this.isLoading = false,
    this.quizzes = const [],
    this.activeQuiz,
    this.activeAttempt,
    this.leaderboard = const [],
    this.errorMessage,
  });

  QuizState copyWith({
    bool? isLoading,
    List<dynamic>? quizzes,
    Map<String, dynamic>? activeQuiz,
    Map<String, dynamic>? activeAttempt,
    List<dynamic>? leaderboard,
    String? errorMessage,
  }) {
    return QuizState(
      isLoading: isLoading ?? this.isLoading,
      quizzes: quizzes ?? this.quizzes,
      activeQuiz: activeQuiz ?? this.activeQuiz,
      activeAttempt: activeAttempt ?? this.activeAttempt,
      leaderboard: leaderboard ?? this.leaderboard,
      errorMessage: errorMessage,
    );
  }
}

class QuizNotifier extends StateNotifier<QuizState> {
  final Ref ref;

  QuizNotifier(this.ref) : super(QuizState());

  Future<void> fetchQuizzes() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/quizzes');
      final list = response.data['data'] as List<dynamic>? ?? [];

      // Save locally to SQLite cache
      await OfflineDatabase.instance.cacheQuizzes(list);

      state = state.copyWith(isLoading: false, quizzes: list);
    } catch (e) {
      // Local fallback
      try {
        final cached = await OfflineDatabase.instance.getCachedQuizzes();
        if (cached.isNotEmpty) {
          state = state.copyWith(isLoading: false, quizzes: cached);
          return;
        }
      } catch (_) {}

      String errMsg = 'Failed to fetch quizzes';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
    }
  }

  Future<bool> startQuizAttempt(String quizId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      
      // 1. Get quiz details
      final quizResponse = await dio.get('/quizzes/$quizId');
      final quizData = quizResponse.data['data'];

      // 2. Cache quiz details locally to SQLite
      if (quizData != null) {
        await OfflineDatabase.instance.cacheQuizQuestions(quizId, quizData);
      }

      // 3. Call backend to start attempt
      final attemptResponse = await dio.post('/quizzes/$quizId/attempts');
      final attemptData = attemptResponse.data['data'];

      state = state.copyWith(
        isLoading: false,
        activeQuiz: quizData,
        activeAttempt: attemptData,
      );
      return true;
    } catch (e) {
      // Offline fallback
      try {
        final cachedQuiz = await OfflineDatabase.instance.getCachedQuiz(quizId);
        if (cachedQuiz != null) {
          final mockAttempt = {
            'id': 'offline_${DateTime.now().millisecondsSinceEpoch}',
            'quizId': quizId,
            'status': 'IN_PROGRESS',
            'startedAt': DateTime.now().toIso8601String(),
          };

          state = state.copyWith(
            isLoading: false,
            activeQuiz: cachedQuiz,
            activeAttempt: mockAttempt,
          );
          return true;
        }
      } catch (_) {}

      String errMsg = 'Failed to start quiz attempt';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return false;
    }
  }

  Future<Map<String, dynamic>?> submitQuizAttempt({
    required String attemptId,
    required List<Map<String, dynamic>> answers,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    
    // Check if this was an offline attempt
    final bool isOfflineAttempt = attemptId.startsWith('offline_');
    final activeQuizId = state.activeQuiz?['id'];

    if (isOfflineAttempt && activeQuizId != null) {
      // Save locally to SQLite offline sync queue
      await OfflineDatabase.instance.saveOfflineQuizAttempt(attemptId, activeQuizId, answers);
      
      state = state.copyWith(
        isLoading: false,
        activeQuiz: null,
        activeAttempt: null,
      );

      // Return a simulated passed response for local flow
      return {
        'score': 0,
        'maxScore': 0,
        'passed': true,
        'percentage': 100.0,
        'status': 'SUBMITTED',
        'message': 'Attempt saved locally. Will sync when online.'
      };
    }

    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/quizzes/attempts/$attemptId/submit', data: {
        'answers': answers,
      });
      final attemptResult = response.data['data'] as Map<String, dynamic>?;
      
      state = state.copyWith(
        isLoading: false,
        activeQuiz: null,
        activeAttempt: null,
      );
      return attemptResult;
    } catch (e) {
      // Fallback: If remote submission fails, save attempt locally
      if (activeQuizId != null) {
        await OfflineDatabase.instance.saveOfflineQuizAttempt(attemptId, activeQuizId, answers);
        state = state.copyWith(
          isLoading: false,
          activeQuiz: null,
          activeAttempt: null,
        );
        return {
          'score': 0,
          'maxScore': 0,
          'passed': true,
          'percentage': 100.0,
          'status': 'SUBMITTED',
          'message': 'Submission failed, saved locally for automatic sync.'
        };
      }

      String errMsg = 'Failed to submit quiz';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return null;
    }
  }

  Future<void> fetchLeaderboard(String quizId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/quizzes/$quizId/leaderboard');
      final list = response.data['data'] as List<dynamic>? ?? [];
      state = state.copyWith(isLoading: false, leaderboard: list);
    } catch (e) {
      String errMsg = 'Failed to fetch leaderboard';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
    }
  }
}

final quizProvider = StateNotifierProvider<QuizNotifier, QuizState>((ref) {
  return QuizNotifier(ref);
});
