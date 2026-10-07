import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock Data
    final List<Map<String, dynamic>> notifications = [
      {
        'title': 'Task Approved',
        'message': 'Your submission for "SEO Audit" has been approved.',
        'time': '2 hours ago',
        'isRead': false,
        'icon': Icons.check_circle,
        'color': Colors.green,
      },
      {
        'title': 'New Message',
        'message': 'Alice sent you a message regarding "Blog Post".',
        'time': '5 hours ago',
        'isRead': false,
        'icon': Icons.message,
        'color': Colors.blue,
      },
      {
        'title': 'Funds Added',
        'message': 'You successfully added \$500.00 to your wallet.',
        'time': '1 day ago',
        'isRead': true,
        'icon': Icons.wallet,
        'color': Colors.orange,
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
        actions: [
          TextButton(
            onPressed: () {},
            child: const Text('Mark all as read'),
          ),
        ],
      ),
      body: ListView.separated(
        itemCount: notifications.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final notification = notifications[index];
          return Container(
            color: notification['isRead'] ? Colors.white : AppColors.primary.withOpacity(0.05),
            child: ListTile(
              leading: Container(
                padding: EdgeInsets.all(8.w),
                decoration: BoxDecoration(
                  color: notification['color'].withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(notification['icon'], color: notification['color'], size: 20.w),
              ),
              title: Text(
                notification['title'],
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14.sp,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Gap(4.h),
                  Text(
                    notification['message'],
                    style: TextStyle(
                      fontSize: 13.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Gap(4.h),
                  Text(
                    notification['time'],
                    style: TextStyle(
                      fontSize: 11.sp,
                      color: AppColors.textSecondary.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
              onTap: () {
                // Mark as read or navigate
              },
            ),
          );
        },
      ),
    );
  }
}
