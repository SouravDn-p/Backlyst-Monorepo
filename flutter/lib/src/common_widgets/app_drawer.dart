import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import '../../authentication/presentation/login_screen.dart';
import '../../tasks/presentation/task_list_screen.dart';
import '../../wallet/presentation/wallet_screen.dart';
import '../../marketplace/presentation/marketplace_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../chat/presentation/chat_list_screen.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../support/presentation/support_screen.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: AppColors.primary),
            currentAccountPicture: const CircleAvatar(
              backgroundColor: Colors.white,
              child: Icon(Icons.person, color: AppColors.primary),
            ),
            accountName: Text(
              'John Doe',
              style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(
              'john.doe@example.com',
              style: TextStyle(fontSize: 14.sp),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            onTap: () {
              Navigator.pop(context); // Close drawer
              // Already on Dashboard
            },
          ),
          ListTile(
            leading: const Icon(Icons.task),
            title: const Text('My Tasks'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const TaskListScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.store),
            title: const Text('Marketplace (Provider)'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const MarketplaceScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.wallet),
            title: const Text('Notifications'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const NotificationsScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.chat),
            title: const Text('Messages'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChatListScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
          const Spacer(),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Help & Support'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SupportScreen()),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Log Out', style: TextStyle(color: Colors.red)),
            onTap: () {
              // Clear session and navigate to Login
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
                (route) => false,
              );
            },
          ),
          Gap(20.h),
        ],
      ),
    );
  }
}
