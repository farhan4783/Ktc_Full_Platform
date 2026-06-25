import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final student = user?.student;

    final String name = user != null ? '${user.firstName} ${user.lastName}' : 'Student';
    final String code = student?.studentCode ?? 'KTC-STUDENT';
    final String branch = student?.branch ?? 'Computer Science';
    final String enrollment = student?.enrollmentNumber ?? 'Not Assigned';
    final double cgpa = student?.cgpa ?? 0.0;
    final int gradYear = student?.graduationYear ?? 2026;

    final String? linkedinUrl = student?.linkedinUrl;
    final String? githubUrl = student?.githubUrl;
    final List<String> skills = student?.skills ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut, color: Colors.redAccent),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: AppTheme.surface,
                  title: const Text('Log Out', style: TextStyle(color: Colors.white)),
                  content: const Text('Are you sure you want to log out of KodeToCareer?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary)),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                      child: const Text('Log Out', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go('/login');
                }
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Avatar & Name Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primary, width: 2),
                        gradient: const LinearGradient(
                          colors: [AppTheme.primary, AppTheme.primaryDark],
                        ),
                      ),
                      child: Center(
                        child: Text(
                          user != null ? '${user.firstName[0]}${user.lastName[0]}' : 'S',
                          style: const TextStyle(
                            color: AppTheme.background,
                            fontWeight: FontWeight.bold,
                            fontSize: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: $code',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Academic Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Academic Info',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Divider(color: AppTheme.border, height: 24),
                    _buildProfileRow('Enrollment No', enrollment),
                    const SizedBox(height: 12),
                    _buildProfileRow('Branch', branch),
                    const SizedBox(height: 12),
                    _buildProfileRow('Graduation Year', gradYear.toString()),
                    const SizedBox(height: 12),
                    _buildProfileRow('Current CGPA', cgpa > 0 ? cgpa.toStringAsFixed(2) : 'Not set'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Certificates Card
            if (student != null) ...[
              FutureBuilder<List<dynamic>>(
                future: _fetchCertificates(ref, student.id),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Card(
                      child: Padding(
                        padding: EdgeInsets.all(20.0),
                        child: Center(
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    );
                  }
                  
                  final certs = snapshot.data ?? [];
                  if (certs.isEmpty) {
                    return const SizedBox.shrink();
                  }

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(LucideIcons.award, color: AppTheme.primary, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Verified Certifications',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ],
                          ),
                          const Divider(color: AppTheme.border, height: 24),
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: certs.length,
                            separatorBuilder: (context, index) => const Divider(color: AppTheme.border, height: 16),
                            itemBuilder: (context, index) {
                              final cert = certs[index];
                              final courseTitle = cert['course']?['title'] ?? 'Course';
                              final certCode = cert['certificateCode'] ?? '';
                              final pdfUrl = cert['pdfUrl'] ?? '';
                              final issuedAtStr = cert['issuedAt'] ?? '';
                              
                              String dateStr = '';
                              if (issuedAtStr.isNotEmpty) {
                                try {
                                  final date = DateTime.parse(issuedAtStr);
                                  dateStr = '${date.day}/${date.month}/${date.year}';
                                } catch (_) {}
                              }

                              return Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          courseTitle,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'ID: $certCode • Issued: $dateStr',
                                          style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(LucideIcons.externalLink, color: AppTheme.primary, size: 18),
                                    onPressed: () async {
                                      if (pdfUrl.isNotEmpty) {
                                        final uri = Uri.parse(pdfUrl);
                                        if (await canLaunchUrl(uri)) {
                                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                                        }
                                      }
                                    },
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],

            // Skills Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Core Skills',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Divider(color: AppTheme.border, height: 24),
                    skills.isEmpty
                        ? const Text('No skills added yet.', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13))
                        : Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: skills.map((skill) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppTheme.background,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppTheme.border),
                                ),
                                child: Text(
                                  skill,
                                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                                ),
                              );
                            }).toList(),
                          ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Social links Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Professional Profiles',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Divider(color: AppTheme.border, height: 24),
                    _buildSocialLinkTile(
                      icon: LucideIcons.linkedin,
                      title: 'LinkedIn Profile',
                      subtitle: linkedinUrl ?? 'Not linked',
                      color: const Color(0xFF0077B5),
                    ),
                    const SizedBox(height: 12),
                    _buildSocialLinkTile(
                      icon: LucideIcons.github,
                      title: 'GitHub Profile',
                      subtitle: githubUrl ?? 'Not linked',
                      color: Colors.white,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        Text(value, style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildSocialLinkTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<List<dynamic>> _fetchCertificates(WidgetRef ref, String studentId) async {
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/certificate/student/$studentId');
      return response.data['data'] as List<dynamic>;
    } catch (e) {
      debugPrint('Error fetching certificates: $e');
      return [];
    }
  }
}
