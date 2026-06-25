import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _pageController = PageController();
  int _currentStep = 0;

  // Step 1 Controllers: Academic Profile
  final _enrollmentController = TextEditingController();
  final _branchController = TextEditingController();
  final _graduationYearController = TextEditingController();
  final _cgpaController = TextEditingController();

  // Step 2 Controllers: Links & Skills
  final _resumeController = TextEditingController();
  final _linkedinController = TextEditingController();
  final _githubController = TextEditingController();
  final _skillsController = TextEditingController(); // Comma-separated

  @override
  void dispose() {
    _pageController.dispose();
    _enrollmentController.dispose();
    _branchController.dispose();
    _graduationYearController.dispose();
    _cgpaController.dispose();
    _resumeController.dispose();
    _linkedinController.dispose();
    _githubController.dispose();
    _skillsController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentStep == 0) {
      // Validate Step 1 fields
      if (_enrollmentController.text.trim().isEmpty ||
          _branchController.text.trim().isEmpty ||
          _graduationYearController.text.trim().isEmpty ||
          _cgpaController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please fill out all academic fields.')),
        );
        return;
      }
      final yr = int.tryParse(_graduationYearController.text.trim());
      if (yr == null || yr < 2000 || yr > 2100) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a valid graduation year.')),
        );
        return;
      }
      final cg = double.tryParse(_cgpaController.text.trim());
      if (cg == null || cg < 0 || cg > 10) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a valid CGPA (0 to 10).')),
        );
        return;
      }
    }
    setState(() {
      _currentStep++;
    });
    _pageController.animateToPage(
      _currentStep,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _prevPage() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final skillsList = _skillsController.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    await ref.read(authProvider.notifier).updateProfile(
          enrollmentNumber: _enrollmentController.text.trim(),
          branch: _branchController.text.trim(),
          graduationYear: int.parse(_graduationYearController.text.trim()),
          cgpa: double.parse(_cgpaController.text.trim()),
          resumeUrl: _resumeController.text.trim(),
          linkedinUrl: _linkedinController.text.trim().isEmpty ? null : _linkedinController.text.trim(),
          githubUrl: _githubController.text.trim().isEmpty ? null : _githubController.text.trim(),
          skills: skillsList.isEmpty ? null : skillsList,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  children: [
                    const Text(
                      'Complete Your Profile',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Fill in details to unlock your personalized dashboard',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    // Progress Indicator (Step tabs)
                    Row(
                      children: [
                        _buildStepTab(0, 'Academics'),
                        const SizedBox(width: 8),
                        _buildStepTab(1, 'Documents & Links'),
                      ],
                    ),
                  ],
                ),
              ),

              // Page Content
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildAcademicStep(),
                    _buildLinksStep(),
                  ],
                ),
              ),

              // Bottom Actions
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  children: [
                    if (_currentStep > 0) ...[
                      OutlinedButton(
                        onPressed: authState.isLoading ? null : _prevPage,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                          side: const BorderSide(color: AppTheme.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Back', style: TextStyle(color: Colors.white)),
                      ),
                      const SizedBox(width: 16),
                    ],
                    Expanded(
                      child: ElevatedButton(
                        onPressed: authState.isLoading
                            ? null
                            : (_currentStep == 1 ? _submit : _nextPage),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ).copyWith(
                          elevation: ButtonStyleButton.allOrNull(0.0),
                        ),
                        child: Container(
                          height: 54,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.primary, AppTheme.primaryDark],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primary.withOpacity(0.2),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: authState.isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  _currentStep == 1 ? 'Finish Setup' : 'Next Step',
                                  style: const TextStyle(
                                    color: AppTheme.background,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepTab(int index, String label) {
    final active = _currentStep == index;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: active ? AppTheme.primary : AppTheme.border,
              width: active ? 2 : 1,
            ),
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: active ? Colors.white : AppTheme.textSecondary,
            fontSize: 12,
            fontWeight: active ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildAcademicStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enrollment / Roll Number *',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _enrollmentController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. 19BCE0123',
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Branch of Study *',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _branchController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Computer Science',
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Graduation Year *',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _graduationYearController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              hintText: 'e.g. 2026',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'CGPA (Out of 10) *',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _cgpaController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              hintText: 'e.g. 8.75',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLinksStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Resume URL (Google Drive / S3 / R2) *',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _resumeController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    hintText: 'https://drive.google.com/file/...',
                    prefixIcon: Icon(Icons.link, color: AppTheme.textSecondary),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) return 'Resume URL is required';
                    if (!value.trim().startsWith('http://') && !value.trim().startsWith('https://')) {
                      return 'Enter a valid URL starting with http/https';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                const Text(
                  'LinkedIn Profile URL',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _linkedinController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    hintText: 'https://linkedin.com/in/...',
                    prefixIcon: Icon(Icons.share, color: AppTheme.textSecondary),
                  ),
                  validator: (value) {
                    if (value != null && value.trim().isNotEmpty) {
                      if (!value.trim().startsWith('http://') && !value.trim().startsWith('https://')) {
                        return 'Enter a valid URL';
                      }
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                const Text(
                  'GitHub Profile URL',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _githubController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    hintText: 'https://github.com/...',
                    prefixIcon: Icon(Icons.account_circle_outlined, color: AppTheme.textSecondary),
                  ),
                  validator: (value) {
                    if (value != null && value.trim().isNotEmpty) {
                      if (!value.trim().startsWith('http://') && !value.trim().startsWith('https://')) {
                        return 'Enter a valid URL';
                      }
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                const Text(
                  'Skills (Comma-separated)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _skillsController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Flutter, Dart, Node.js, Python',
                    prefixIcon: Icon(Icons.star_border, color: AppTheme.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: child,
      ),
    );
  }
}
