import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../providers/placement_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class PlacementScreen extends ConsumerStatefulWidget {
  const PlacementScreen({super.key});

  @override
  ConsumerState<PlacementScreen> createState() => _PlacementScreenState();
}

class _PlacementScreenState extends ConsumerState<PlacementScreen> {
  final _resumeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(placementProvider.notifier).fetchJobs();
      final user = ref.read(authProvider).user;
      if (user?.student?.resumeUrl != null) {
        _resumeController.text = user!.student!.resumeUrl!;
      }
    });
  }

  @override
  void dispose() {
    _resumeController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadResume() async {
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );

      if (result != null && result.files.single.path != null) {
        final fileName = result.files.single.name;
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Selected resume: $fileName. Uploading & Parsing...'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppTheme.primaryDark,
          ),
        );

        final user = ref.read(authProvider).user;
        final student = user?.student;
        if (student == null) return;

        // In a real production flow, this would call the presigned URL upload to R2
        // We simulate this by uploading to R2-style CDN URL:
        final String mockR2Url = 'https://cdn.kodetocareer.com/resumes/${student.id}.pdf';

        final success = await ref.read(authProvider.notifier).updateProfile(
              enrollmentNumber: student.enrollmentNumber ?? '',
              branch: student.branch ?? '',
              graduationYear: student.graduationYear ?? 2026,
              cgpa: student.cgpa ?? 8.0,
              resumeUrl: mockR2Url,
              phone: user?.phone,
              linkedinUrl: student.linkedinUrl,
              githubUrl: student.githubUrl,
              skills: student.skills,
            );

        if (success) {
          setState(() {
            _resumeController.text = mockR2Url;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Resume uploaded and parsed! Match skills synchronized.'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: Colors.green,
            ),
          );
          // Refresh user profile to fetch updated parsed skills
          await ref.read(authProvider.notifier).initialize();
        }
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to pick file.'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final student = user?.student;

    final placementState = ref.watch(placementProvider);

    final int readinessScore = student?.cgpa != null ? ((student!.cgpa! / 10.0) * 100).round() : 75;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Placement Hub',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Readiness Gauge Card
            _buildReadinessCard(readinessScore),
            const SizedBox(height: 20),

            // AI Mock Interview
            _buildMockInterviewCard(),
            const SizedBox(height: 20),

            // Resume URL Box
            _buildResumeBox(authState.isLoading),
            const SizedBox(height: 24),

            // Job Listings Title
            const Text(
              'Active Job Openings',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),

            // Job Listings Board
            placementState.isLoading
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                      ),
                    ),
                  )
                : placementState.errorMessage != null
                    ? Center(
                        child: Text(
                          placementState.errorMessage!,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      )
                    : placementState.jobs.isEmpty
                        ? _buildEmptyJobs()
                        : _buildJobsList(placementState.jobs, placementState.interestedJobs),
          ],
        ),
      ),
    );
  }

  Widget _buildReadinessCard(int score) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Readiness Assessment',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  '$score/100',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: score / 100.0,
                minHeight: 8,
                backgroundColor: AppTheme.border,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Complete course assessments, maintain a high CGPA, and upload your resume to maximize your job visibility score.',
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResumeBox(bool isLoading) {
    return Container(
      decoration: AppTheme.glassDecoration(),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.fileText, color: AppTheme.primary, size: 20),
              SizedBox(width: 10),
              Text(
                'Resume Upload',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _resumeController.text.isNotEmpty 
                ? 'Attached: ${_resumeController.text.split("/").last}' 
                : 'No resume uploaded. Upload a PDF to automatically extract skills.',
            style: TextStyle(
              fontSize: 12,
              color: _resumeController.text.isNotEmpty ? Colors.white70 : AppTheme.textSecondary,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: isLoading ? null : _pickAndUploadResume,
              icon: const Icon(LucideIcons.upload, size: 16),
              label: const Text('Choose PDF Resume'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: AppTheme.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMockInterviewCard() {
    return Container(
      decoration: AppTheme.glassDecoration(),
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF8B5CF6).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(LucideIcons.messageSquare, color: Color(0xFF8B5CF6), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AI Interview Practice',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'Grade your soft skills with AI feedback.',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => context.go('/placement/mock-interview'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
            ),
            child: const Text('Start', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyJobs() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40.0),
        child: Column(
          children: [
            Icon(LucideIcons.briefcase, color: AppTheme.textSecondary, size: 48),
            const SizedBox(height: 16),
            const Text(
              'No jobs listed yet.',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Active job postings will be listed here.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobsList(List<dynamic> jobs, List<dynamic> interestedJobs) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: jobs.length,
      itemBuilder: (context, index) {
        final job = jobs[index];
        final id = job['id'] ?? '';
        final title = job['title'] ?? 'Role Title';
        final company = job['companyName'] ?? 'Company Name';
        final location = job['location'] ?? 'Remote';
        final isRemote = job['isRemote'] as bool? ?? false;
        final jobType = job['jobType'] ?? 'FULL_TIME';
        final skills = job['skillsRequired'] as List<dynamic>? ?? [];
        final deadline = job['applyDeadline'];

        // Determine CTC
        String ctcText = 'Unspecified';
        if (job['ctcMin'] != null || job['ctcMax'] != null) {
          final min = job['ctcMin'] != null ? '${job['ctcMin'].toInt()}L' : '0L';
          final max = job['ctcMax'] != null ? '${job['ctcMax'].toInt()}L' : '';
          ctcText = max.isNotEmpty ? '$min - $max LPA' : '$min LPA';
        } else if (job['stipendMonthly'] != null) {
          ctcText = '₹${job['stipendMonthly'].toInt()}/month';
        }

        // Check if student has already registered interest
        final isInterested = interestedJobs.any((interest) => interest['jobId'] == id);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            border: Border.all(color: AppTheme.border, width: 1),
            borderRadius: BorderRadius.circular(16),
          ),
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
                            title,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            company,
                            style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.border,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        jobType.toString().replaceAll('_', ' '),
                        style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Metadata Row
                Row(
                  children: [
                    _buildMetaIcon(LucideIcons.mapPin, location + (isRemote ? ' (Remote)' : '')),
                    const SizedBox(width: 16),
                    _buildMetaIcon(LucideIcons.dollarSign, ctcText),
                  ],
                ),
                const SizedBox(height: 12),
                if (deadline != null) ...[
                  _buildMetaIcon(
                    LucideIcons.calendar,
                    'Apply by: ${DateFormat('dd MMM yyyy').format(DateTime.parse(deadline))}',
                  ),
                  const SizedBox(height: 16),
                ],

                // Skills Required
                if (skills.isNotEmpty) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: skills.map((s) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.border, width: 0.5),
                        ),
                        child: Text(
                          s.toString(),
                          style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                ],

                // Action Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (isInterested)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          border: Border.all(color: Colors.green),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(LucideIcons.check, color: Colors.green, size: 14),
                            SizedBox(width: 6),
                            Text(
                              'Interested',
                              style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )
                    else
                      ElevatedButton(
                        onPressed: () {
                          ref.read(placementProvider.notifier).trackJobInterest(id, 'INTERESTED');
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        ),
                        child: const Text('I\'m Interested', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetaIcon(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.textSecondary),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
        ),
      ],
    );
  }
}
