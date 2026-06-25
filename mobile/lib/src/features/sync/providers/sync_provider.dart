import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/database/offline_database.dart';
import '../../auth/providers/auth_provider.dart';

class SyncState {
  final bool isSyncing;
  final String? syncStatusMessage;

  SyncState({
    this.isSyncing = false,
    this.syncStatusMessage,
  });

  SyncState copyWith({
    bool? isSyncing,
    String? syncStatusMessage,
  }) {
    return SyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      syncStatusMessage: syncStatusMessage,
    );
  }
}

class SyncNotifier extends StateNotifier<SyncState> {
  final Ref ref;

  SyncNotifier(this.ref) : super(SyncState());

  Future<bool> checkOnline() async {
    try {
      final dio = ref.read(dioProvider);
      // Check server availability
      await dio.get('/auth/me');
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> syncOfflineData() async {
    final authState = ref.read(authProvider);
    final studentId = authState.user?.student?.id;
    if (studentId == null) return;

    final isOnline = await checkOnline();
    if (!isOnline) {
      state = SyncState(syncStatusMessage: 'Device is offline. Retrying later.');
      return;
    }

    state = SyncState(isSyncing: true, syncStatusMessage: 'Syncing watch progress...');
    final db = OfflineDatabase.instance;

    // 1. Sync Watch Progress
    try {
      final unsyncedProgress = await db.getUnsyncedProgress();
      final dio = ref.read(dioProvider);

      for (var progress in unsyncedProgress) {
        final lessonId = progress['lessonId'] as String;
        final progressSeconds = progress['progressSeconds'] as int;
        final isCompleted = progress['isCompleted'] == 1;

        try {
          await dio.post('/students/$studentId/progress', data: {
            'lessonId': lessonId,
            'videoProgressSecs': progressSeconds,
            'isCompleted': isCompleted,
          });
          await db.markProgressSynced(lessonId);
        } catch (_) {
          // Keep in queue if failed
        }
      }
    } catch (_) {}

    state = state.copyWith(syncStatusMessage: 'Syncing quiz attempts...');

    // 2. Sync Quiz Attempts
    try {
      final unsyncedAttempts = await db.getUnsyncedQuizAttempts();
      final dio = ref.read(dioProvider);

      for (var attempt in unsyncedAttempts) {
        final quizId = attempt['quizId'] as String;
        final localId = attempt['id'] as String;
        final answersList = jsonDecode(attempt['answersJson']) as List<dynamic>;

        try {
          // Start attempt
          final startResponse = await dio.post('/quizzes/$quizId/attempts');
          final serverAttemptId = startResponse.data['data']['id'];

          // Submit attempt
          await dio.post('/quizzes/attempts/$serverAttemptId/submit', data: {
            'answers': answersList,
          });

          await db.markQuizAttemptSynced(localId);
        } catch (_) {
          // Keep in queue if failed
        }
      }
    } catch (_) {}

    state = SyncState(isSyncing: false, syncStatusMessage: 'All data synchronized.');
  }
}

final syncProvider = StateNotifierProvider<SyncNotifier, SyncState>((ref) {
  return SyncNotifier(ref);
});
