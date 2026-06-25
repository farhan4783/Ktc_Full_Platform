import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../models/user_model.dart';
export '../models/user_model.dart';

class AuthState {
  final bool isInitialized;
  final bool isLoading;
  final UserModel? user;
  final String? errorMessage;

  AuthState({
    this.isInitialized = false,
    this.isLoading = false,
    this.user,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    bool? isInitialized,
    bool? isLoading,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isInitialized: isInitialized ?? this.isInitialized,
      isLoading: isLoading ?? this.isLoading,
      user: user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref ref;

  AuthNotifier(this.ref) : super(AuthState()) {
    initialize();
  }

  Future<void> initialize() async {
    final storage = ref.read(secureStorageProvider);
    final accessToken = await storage.read(key: 'accessToken');

    if (accessToken == null) {
      state = AuthState(isInitialized: true);
      return;
    }

    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/auth/me');
      
      final userData = response.data['data'];
      final user = UserModel.fromJson(userData);
      
      state = AuthState(
        isInitialized: true,
        user: user,
      );
    } catch (e) {
      // Token might be invalid or expired and refresh failed
      await storage.delete(key: 'accessToken');
      await storage.delete(key: 'refreshToken');
      state = AuthState(isInitialized: true);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final successData = response.data['data'];
      final accessToken = successData['accessToken'];
      final refreshToken = successData['refreshToken'];

      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'accessToken', value: accessToken);
      await storage.write(key: 'refreshToken', value: refreshToken);

      // Fetch complete profile with /auth/me
      final meResponse = await dio.get('/auth/me');
      final userData = meResponse.data['data'];
      final user = UserModel.fromJson(userData);

      state = state.copyWith(
        isLoading: false,
        user: user,
      );
      return true;
    } catch (e) {
      String errMsg = 'Login failed';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return false;
    }
  }

  Future<bool> register(String firstName, String lastName, String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
      });

      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      String errMsg = 'Registration failed';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return false;
    }
  }

  Future<bool> verifyEmail(String email, String otp) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/auth/verify-email', data: {
        'email': email,
        'otp': otp,
      });

      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      String errMsg = 'Verification failed';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return false;
    }
  }

  Future<bool> updateProfile({
    required String enrollmentNumber,
    required String branch,
    required int graduationYear,
    required double cgpa,
    required String resumeUrl,
    String? phone,
    String? linkedinUrl,
    String? githubUrl,
    List<String>? skills,
  }) async {
    if (state.user == null || state.user!.student == null) return false;
    state = state.copyWith(isLoading: true, errorMessage: null);
    
    try {
      final dio = ref.read(dioProvider);
      final studentId = state.user!.student!.id;

      final data = {
        'enrollmentNumber': enrollmentNumber,
        'branch': branch,
        'graduationYear': graduationYear,
        'cgpa': cgpa,
        'resumeUrl': resumeUrl,
        if (phone != null) 'phone': phone,
        if (linkedinUrl != null) 'linkedinUrl': linkedinUrl,
        if (githubUrl != null) 'githubUrl': githubUrl,
        if (skills != null) 'skills': skills,
      };

      await dio.patch('/student/$studentId', data: data);

      // Reload profile
      final meResponse = await dio.get('/auth/me');
      final userData = meResponse.data['data'];
      final user = UserModel.fromJson(userData);

      state = state.copyWith(
        isLoading: false,
        user: user,
      );
      return true;
    } catch (e) {
      String errMsg = 'Profile update failed';
      if (e is DioException) {
        errMsg = e.response?.data?['message'] ?? e.message ?? errMsg;
      }
      state = state.copyWith(isLoading: false, errorMessage: errMsg);
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/auth/logout');
    } catch (_) {
      // Ignore network errors on logout
    }

    final storage = ref.read(secureStorageProvider);
    await storage.delete(key: 'accessToken');
    await storage.delete(key: 'refreshToken');

    state = AuthState(
      isInitialized: true,
      user: null,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
