import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/course_provider.dart';
import '../../../core/theme/app_theme.dart';

class CourseSyllabusScreen extends ConsumerStatefulWidget {
  final String courseId;
  final String courseName;

  const CourseSyllabusScreen({
    super.key,
    required this.courseId,
    required this.courseName,
  });

  @override
  ConsumerState<CourseSyllabusScreen> createState() => _CourseSyllabusScreenState();
}

class _CourseSyllabusScreenState extends ConsumerState<CourseSyllabusScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(courseProvider.notifier).fetchCourseSyllabus(widget.courseId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(courseProvider);
    final course = state.selectedCourse;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.courseName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/learn'),
        ),
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
                        onPressed: () => ref.read(courseProvider.notifier).fetchCourseSyllabus(widget.courseId),
                        child: const Text('Try Again'),
                      ),
                    ],
                  ),
                )
              : course == null
                  ? const Center(child: Text('Course data not found', style: TextStyle(color: Colors.white)))
                  : _buildSyllabusList(course),
    );
  }

  Widget _buildSyllabusList(Map<String, dynamic> course) {
    final modules = course['modules'] as List<dynamic>? ?? [];

    if (modules.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.folder, color: AppTheme.textSecondary, size: 56),
            const SizedBox(height: 16),
            const Text(
              'No modules published yet.',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20.0),
      itemCount: modules.length,
      itemBuilder: (context, index) {
        final module = modules[index];
        final moduleTitle = module['title'] ?? 'Module Title';
        final lessons = module['lessons'] as List<dynamic>? ?? [];

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: ExpansionTile(
            title: Text(
              moduleTitle,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.white,
              ),
            ),
            subtitle: Text(
              '${lessons.length} Lessons',
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
            collapsedIconColor: AppTheme.primary,
            iconColor: AppTheme.primary,
            childrenPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: lessons.isEmpty
                ? [
                    const Padding(
                      padding: EdgeInsets.all(12.0),
                      child: Text(
                        'No lessons inside this module.',
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                    )
                  ]
                : lessons.map((lesson) {
                    final lessonTitle = lesson['title'] ?? 'Lesson Title';
                    final lessonType = lesson['lessonType'] ?? 'VIDEO';
                    final duration = lesson['durationMinutes'] as int? ?? 15;
                    final lessonId = lesson['id'] ?? '';

                    IconData lessonIcon = LucideIcons.playCircle;
                    if (lessonType == 'PDF') {
                      lessonIcon = LucideIcons.fileText;
                    } else if (lessonType == 'TEXT') {
                      lessonIcon = LucideIcons.file;
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.background.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.border, width: 0.5),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Icon(lessonIcon, size: 18, color: AppTheme.primary),
                        ),
                        title: Text(
                          lessonTitle,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          '$duration Mins • $lessonType',
                          style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                        ),
                        trailing: const Icon(LucideIcons.play, size: 14, color: AppTheme.primary),
                        onTap: () {
                          // Extract videoUrl/pdfUrl from lesson videos/notes
                          String? videoUrl;
                          String? pdfUrl;

                          // The mock lesson has a single video link or PDF link
                          final videos = lesson['lessonVideos'] as List<dynamic>?;
                          if (videos != null && videos.isNotEmpty) {
                            videoUrl = videos[0]['cdnUrl'] ?? videos[0]['rawUrl'];
                          }

                          final notes = lesson['lessonNotes'] as List<dynamic>?;
                          if (notes != null && notes.isNotEmpty) {
                            pdfUrl = notes[0]['fileUrl'];
                          }

                          // Navigate to lesson viewer
                          context.go(
                            '/learn/lessons/$lessonId',
                            extra: {
                              'title': lessonTitle,
                              'videoUrl': videoUrl,
                              'pdfUrl': pdfUrl,
                            },
                          );
                        },
                      ),
                    );
                  }).toList(),
          ),
        );
      },
    );
  }
}
