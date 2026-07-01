import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/database/offline_database.dart';
import '../../auth/providers/auth_provider.dart';

class CourseState {
  final bool isLoading;
  final List<dynamic> batches;
  final Map<String, dynamic>? selectedCourse;
  final String? errorMessage;

  CourseState({
    this.isLoading = false,
    this.batches = const [],
    this.selectedCourse,
    this.errorMessage,
  });

  CourseState copyWith({
    bool? isLoading,
    List<dynamic>? batches,
    Map<String, dynamic>? selectedCourse,
    String? errorMessage,
  }) {
    return CourseState(
      isLoading: isLoading ?? this.isLoading,
      batches: batches ?? this.batches,
      selectedCourse: selectedCourse,
      errorMessage: errorMessage,
    );
  }
}

class CourseNotifier extends StateNotifier<CourseState> {
  final Ref ref;

  CourseNotifier(this.ref) : super(CourseState());

  Future<void> fetchBatches() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/batches');
      final list = response.data['data'] as List<dynamic>? ?? [];
      
      // Save locally to SQLite
      await OfflineDatabase.instance.cacheCourses(list);
      
      state = state.copyWith(isLoading: false, batches: list);
    } catch (e) {
      // Local fallback
      try {
        final cached = await OfflineDatabase.instance.getCachedCourses();
        if (cached.isNotEmpty) {
          state = state.copyWith(isLoading: false, batches: cached);
          return;
        }
      } catch (_) {}

      String errMsg = 'Failed to fetch batches';
      if (e is DioException) {
        errMsg = e.response?.data?['error']?['message'] ?? e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
    }
  }

  Future<void> fetchCourseSyllabus(String courseId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/courses/$courseId');
      final courseData = response.data['data'] as Map<String, dynamic>?;
      
      // Save locally to SQLite
      if (courseData != null) {
        await OfflineDatabase.instance.cacheSyllabus(courseId, courseData);
      }
      
      state = state.copyWith(isLoading: false, selectedCourse: courseData);
    } catch (e) {
      // Local fallback
      try {
        final cached = await OfflineDatabase.instance.getCachedCourseSyllabus(courseId);
        if (cached != null) {
          state = state.copyWith(isLoading: false, selectedCourse: cached);
          return;
        }
      } catch (_) {}

      String errMsg = 'Failed to fetch course details';
      if (e is DioException) {
        errMsg = e.response?.data?['error']?['message'] ?? e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
    }
  }

  Future<bool> syncLessonProgress({
    required String lessonId,
    required int progressSeconds,
    required bool isCompleted,
  }) async {
    // 1. Always save progress locally first
    await OfflineDatabase.instance.saveWatchProgress(lessonId, progressSeconds, isCompleted);

    final authState = ref.read(authProvider);
    final studentId = authState.user?.student?.id;
    if (studentId == null) return false;

    try {
      final dio = ref.read(dioProvider);
      await dio.post('/students/$studentId/progress', data: {
        'lessonId': lessonId,
        'videoProgressSecs': progressSeconds,
        'isCompleted': isCompleted,
      });
      // Mark as synced locally
      await OfflineDatabase.instance.markProgressSynced(lessonId);
      return true;
    } catch (_) {
      // Return false but kept in local db waiting for sync provider
      return false;
    }
  }
}

final courseProvider = StateNotifierProvider<CourseNotifier, CourseState>((ref) {
  return CourseNotifier(ref);
});
