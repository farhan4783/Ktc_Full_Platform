import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';

class PlacementState {
  final bool isLoading;
  final List<dynamic> jobs;
  final List<dynamic> interestedJobs;
  final String? errorMessage;

  PlacementState({
    this.isLoading = false,
    this.jobs = const [],
    this.interestedJobs = const [],
    this.errorMessage,
  });

  PlacementState copyWith({
    bool? isLoading,
    List<dynamic>? jobs,
    List<dynamic>? interestedJobs,
    String? errorMessage,
  }) {
    return PlacementState(
      isLoading: isLoading ?? this.isLoading,
      jobs: jobs ?? this.jobs,
      interestedJobs: interestedJobs ?? this.interestedJobs,
      errorMessage: errorMessage,
    );
  }
}

class PlacementNotifier extends StateNotifier<PlacementState> {
  final Ref ref;

  PlacementNotifier(this.ref) : super(PlacementState());

  Future<void> fetchJobs() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/jobs');
      final list = response.data['data'] as List<dynamic>? ?? [];
      
      // Fetch user interests
      final interestsResponse = await dio.get('/jobs/my-interests');
      final interestsList = interestsResponse.data['data'] as List<dynamic>? ?? [];

      state = state.copyWith(
        isLoading: false,
        jobs: list,
        interestedJobs: interestsList,
      );
    } catch (e) {
      String errMsg = 'Failed to load jobs';
      if (e is DioException) {
        errMsg = e.response?.data?['error']?['message'] ?? e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
    }
  }

  Future<bool> trackJobInterest(String jobId, String status) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/jobs/$jobId/interest', data: {'status': status});
      
      // Reload jobs
      await fetchJobs();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final placementProvider = StateNotifierProvider<PlacementNotifier, PlacementState>((ref) {
  return PlacementNotifier(ref);
});
