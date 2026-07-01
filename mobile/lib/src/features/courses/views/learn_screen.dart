import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/course_provider.dart';
import '../../../core/theme/app_theme.dart';

class LearnScreen extends ConsumerStatefulWidget {
  const LearnScreen({super.key});

  @override
  ConsumerState<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends ConsumerState<LearnScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(courseProvider.notifier).fetchBatches();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(courseProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Courses',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: state.isLoading
          ? Shimmer.fromColors(
              baseColor: const Color(0xFF0C1324),
              highlightColor: const Color(0xFF1E293B),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                itemCount: 3,
                itemBuilder: (context, index) {
                  return Container(
                    height: 140,
                    margin: const EdgeInsets.only(bottom: 16.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                  );
                },
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
                        onPressed: () => ref.read(courseProvider.notifier).fetchBatches(),
                        child: const Text('Try Again'),
                      ),
                    ],
                  ),
                )
              : state.batches.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.bookOpen, color: AppTheme.textSecondary, size: 64),
                          const SizedBox(height: 16),
                          const Text(
                            'No enrolled courses found.',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Please contact your administration for batch assignment.',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      itemCount: state.batches.length,
                      itemBuilder: (context, index) {
                        final batch = state.batches[index];
                        final course = batch['course'];
                        final courseTitle = course?['title'] ?? 'Course Title';
                        final batchCode = batch['code'] ?? 'Batch Code';
                        final courseId = course?['id'] ?? '';
                        final completionPct = batch['completionPct'] as num? ?? 15.0;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16.0),
                          decoration: AppTheme.glassDecoration(),
                          child: InkWell(
                            onTap: () {
                              if (courseId.isNotEmpty) {
                                context.go('/learn/courses/$courseId', extra: courseTitle);
                              }
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              courseTitle,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.white,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Batch: $batchCode',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: AppTheme.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Icon(
                                        LucideIcons.chevronRight,
                                        color: AppTheme.primary,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Overall Progress',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                      Text(
                                        '${completionPct.toInt()}%',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  // Gradient Progress Bar
                                  Stack(
                                    children: [
                                      Container(
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: AppTheme.border,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                      LayoutBuilder(
                                        builder: (context, constraints) {
                                          final double pct = (completionPct / 100.0).clamp(0.0, 1.0);
                                          return Container(
                                            height: 6,
                                            width: constraints.maxWidth * pct,
                                            decoration: BoxDecoration(
                                              gradient: AppTheme.accentGradient,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                          );
                                        }
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
extension on Widget {
  Widget margin({double bottom = 16}) {
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: this,
    );
  }
}
