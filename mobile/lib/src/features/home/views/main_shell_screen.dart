import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class MainShellScreen extends StatelessWidget {
  final Widget child;

  const MainShellScreen({
    super.key,
    required this.child,
  });

  int _getSelectedIndex(String location) {
    if (location.startsWith('/learn')) return 1;
    if (location.startsWith('/quizzes')) return 2;
    if (location.startsWith('/placement')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0; // Default to /home
  }

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/learn');
        break;
      case 2:
        context.go('/quizzes');
        break;
      case 3:
        context.go('/placement');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final selectedIndex = _getSelectedIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AppTheme.border, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          onTap: (index) => _onItemTapped(context, index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppTheme.background,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textSecondary,
          selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.home, size: 20),
              activeIcon: Icon(LucideIcons.home, size: 20, color: AppTheme.primary),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.bookOpen, size: 20),
              activeIcon: Icon(LucideIcons.bookOpen, size: 20, color: AppTheme.primary),
              label: 'Learn',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.helpCircle, size: 20),
              activeIcon: Icon(LucideIcons.helpCircle, size: 20, color: AppTheme.primary),
              label: 'Quizzes',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.briefcase, size: 20),
              activeIcon: Icon(LucideIcons.briefcase, size: 20, color: AppTheme.primary),
              label: 'Placement',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.user, size: 20),
              activeIcon: Icon(LucideIcons.user, size: 20, color: AppTheme.primary),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
