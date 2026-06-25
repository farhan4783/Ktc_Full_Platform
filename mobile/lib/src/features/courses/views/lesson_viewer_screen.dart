import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/course_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/offline_database.dart';

class LessonViewerScreen extends ConsumerStatefulWidget {
  final String lessonId;
  final String title;
  final String? videoUrl;
  final String? pdfUrl;

  const LessonViewerScreen({
    super.key,
    required this.lessonId,
    required this.title,
    this.videoUrl,
    this.pdfUrl,
  });

  @override
  ConsumerState<LessonViewerScreen> createState() => _LessonViewerScreenState();
}

class _LessonViewerScreenState extends ConsumerState<LessonViewerScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _noteController = TextEditingController();

  // Video playback
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isVideoLoading = true;
  Timer? _progressTimer;
  int _lastSyncedPosition = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadSavedNotes();
    if (widget.videoUrl != null && widget.videoUrl!.isNotEmpty) {
      _initVideoPlayer();
    }
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _saveNotes();
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    _tabController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _initVideoPlayer() async {
    try {
      final savedSecs = await OfflineDatabase.instance.getSavedWatchProgress(widget.lessonId);

      _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl!));
      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        startAt: Duration(seconds: savedSecs),
        aspectRatio: _videoPlayerController!.value.aspectRatio,
        allowFullScreen: true,
        allowMuting: true,
        showControls: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: AppTheme.primary,
          handleColor: AppTheme.primaryDark,
          backgroundColor: AppTheme.border,
          bufferedColor: Colors.white24,
        ),
      );

      setState(() {
        _isVideoLoading = false;
      });

      // Start periodic sync timer
      _progressTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
        _syncProgress();
      });
    } catch (_) {
      setState(() {
        _isVideoLoading = false;
      });
    }
  }

  Future<void> _syncProgress() async {
    if (_videoPlayerController == null || !_videoPlayerController!.value.isInitialized) return;

    final currentPosition = _videoPlayerController!.value.position.inSeconds;
    final totalDuration = _videoPlayerController!.value.duration.inSeconds;

    if (currentPosition == _lastSyncedPosition) return;

    final isCompleted = currentPosition >= (totalDuration * 0.9).round();
    
    final success = await ref.read(courseProvider.notifier).syncLessonProgress(
          lessonId: widget.lessonId,
          progressSeconds: currentPosition,
          isCompleted: isCompleted,
        );

    if (success) {
      _lastSyncedPosition = currentPosition;
    }
  }

  Future<void> _loadSavedNotes() async {
    final authState = ref.read(authProvider);
    final studentId = authState.user?.student?.id ?? 'guest';
    final prefs = await SharedPreferences.getInstance();
    final key = 'notes_${studentId}_${widget.lessonId}';
    setState(() {
      _noteController.text = prefs.getString(key) ?? '';
    });
  }

  Future<void> _saveNotes() async {
    final authState = ref.read(authProvider);
    final studentId = authState.user?.student?.id ?? 'guest';
    final prefs = await SharedPreferences.getInstance();
    final key = 'notes_${studentId}_${widget.lessonId}';
    await prefs.setString(key, _noteController.text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            _syncProgress();
            context.pop();
          },
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: AppTheme.textSecondary,
          tabs: const [
            Tab(icon: Icon(LucideIcons.play, size: 18), text: 'Content'),
            Tab(icon: Icon(LucideIcons.fileText, size: 18), text: 'Notes'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildContentTab(),
          _buildNotesTab(),
        ],
      ),
    );
  }

  Widget _buildContentTab() {
    if (widget.videoUrl != null && widget.videoUrl!.isNotEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black,
              child: _isVideoLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                      ),
                    )
                  : _chewieController != null
                      ? Chewie(controller: _chewieController!)
                      : const Center(
                          child: Text(
                            'Failed to load video.',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Video Lesson',
                        style: TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  'Watch the complete video tutorial above. Your learning progress is tracked automatically in real time.',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (widget.pdfUrl != null && widget.pdfUrl!.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                LucideIcons.fileText,
                size: 64,
                color: AppTheme.primary,
              ),
              const SizedBox(height: 16),
              const Text(
                'Reading Material Available',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              const Text(
                'Download or view the syllabus study notes using the button below.',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  // Trigger PDF view / external link mock
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Opening PDF: ${widget.pdfUrl}'),
                      backgroundColor: AppTheme.primaryDark,
                    ),
                  );
                },
                child: const Text('Open PDF Notes'),
              ),
            ],
          ),
        ),
      );
    }

    return const Center(
      child: Text(
        'No media content available for this lesson.',
        style: TextStyle(color: Colors.white),
      ),
    );
  }

  Widget _buildNotesTab() {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Personal Study Notes',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              Text(
                'Autosaved locally',
                style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: TextFormField(
                controller: _noteController,
                maxLines: null,
                keyboardType: TextInputType.multiline,
                style: const TextStyle(fontSize: 14, color: Colors.white, height: 1.4),
                decoration: const InputDecoration(
                  hintText: 'Start writing your notes here... (e.g. key formulae, reminders, etc.)',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.all(16),
                ),
                onChanged: (text) => _saveNotes(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
