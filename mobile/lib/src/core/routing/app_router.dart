import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/views/login_screen.dart';
import '../../features/auth/views/register_screen.dart';
import '../../features/auth/views/email_verification_screen.dart';
import '../../features/auth/views/profile_setup_screen.dart';
import '../../features/auth/views/splash_screen.dart';
import '../../features/home/views/main_shell_screen.dart';
import '../../features/home/views/home_screen.dart';
import '../../features/courses/views/learn_screen.dart';
import '../../features/courses/views/course_syllabus_screen.dart';
import '../../features/courses/views/lesson_viewer_screen.dart';
import '../../features/quizzes/views/quizzes_screen.dart';
import '../../features/quizzes/views/quiz_attempt_screen.dart';
import '../../features/profile/views/placement_screen.dart';
import '../../features/profile/views/mock_interview_screen.dart';
import '../../features/profile/views/profile_screen.dart';

final appRouter = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: _RefToSignaler(ref),
    redirect: (context, state) {
      final isInitialized = authState.isInitialized;
      if (!isInitialized) {
        return '/splash';
      }

      final isAuthenticated = authState.isAuthenticated;
      final isLoggingIn = state.matchedLocation == '/login';
      final isRegistering = state.matchedLocation == '/register';
      final isVerifyingEmail = state.matchedLocation == '/verify-email';
      final isSplash = state.matchedLocation == '/splash';

      final isAuthFlow = isLoggingIn || isRegistering || isVerifyingEmail || isSplash;

      if (!isAuthenticated) {
        if (!isAuthFlow) {
          return '/login';
        }
        if (isSplash) {
          return '/login';
        }
        return null;
      }

      // User is authenticated
      final user = authState.user;
      final isStudent = user?.role == 'STUDENT';
      final profileCompleted = user?.student?.profileCompleted ?? false;

      if (isStudent && !profileCompleted) {
        if (state.matchedLocation != '/profile-setup') {
          return '/profile-setup';
        }
        return null;
      }

      if (isStudent && profileCompleted && state.matchedLocation == '/profile-setup') {
        return '/home';
      }

      if (isAuthFlow) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final email = state.extra as String? ?? '';
          return EmailVerificationScreen(email: email);
        },
      ),
      GoRoute(
        path: '/profile-setup',
        builder: (context, state) => const ProfileSetupScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return MainShellScreen(child: child);
        },
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/learn',
            builder: (context, state) => const LearnScreen(),
            routes: [
              GoRoute(
                path: 'courses/:courseId',
                builder: (context, state) {
                  final courseId = state.pathParameters['courseId']!;
                  final courseName = state.extra as String? ?? 'Course';
                  return CourseSyllabusScreen(courseId: courseId, courseName: courseName);
                },
              ),
              GoRoute(
                path: 'lessons/:lessonId',
                builder: (context, state) {
                  final lessonId = state.pathParameters['lessonId']!;
                  final extra = state.extra as Map<String, dynamic>?;
                  final videoUrl = extra?['videoUrl'] as String?;
                  final pdfUrl = extra?['pdfUrl'] as String?;
                  final lessonTitle = extra?['title'] as String? ?? 'Lesson';
                  return LessonViewerScreen(
                    lessonId: lessonId,
                    title: lessonTitle,
                    videoUrl: videoUrl,
                    pdfUrl: pdfUrl,
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: '/quizzes',
            builder: (context, state) => const QuizzesScreen(),
            routes: [
              GoRoute(
                path: 'attempt/:quizId',
                builder: (context, state) {
                  final quizId = state.pathParameters['quizId']!;
                  final extra = state.extra as Map<String, dynamic>?;
                  final duration = extra?['duration'] as int? ?? 30;
                  final title = extra?['title'] as String? ?? 'Quiz';
                  return QuizAttemptScreen(
                    quizId: quizId,
                    title: title,
                    durationMinutes: duration,
                  );
                },
              ),
            ],
          ),
          GoRoute(
            path: '/placement',
            builder: (context, state) => const PlacementScreen(),
            routes: [
              GoRoute(
                path: 'mock-interview',
                builder: (context, state) => const MockInterviewScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});

class _RefToSignaler extends ChangeNotifier {
  _RefToSignaler(Ref ref) {
    ref.listen(authProvider, (_, __) {
      notifyListeners();
    });
  }
}
