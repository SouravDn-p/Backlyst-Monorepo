import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'chat_detail_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock Data
    final List<Map<String, dynamic>> chats = [
      {
        'name': 'Alice Smith',
        'message': 'Can you clarify the requirements for...',
        'time': '10:30 AM',
        'unread': 2,
        'image': 'https://via.placeholder.com/150',
      },
      {
        'name': 'Bob Johnson',
        'message': 'Work submitted! Please review.',
        'time': 'Yesterday',
        'unread': 0,
        'image': 'https://via.placeholder.com/150',
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: ListView.separated(
        padding: EdgeInsets.all(16.w),
        itemCount: chats.length,
        separatorBuilder: (context, index) => Gap(16.h),
        itemBuilder: (context, index) {
          final chat = chats[index];
          return ListTile(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatDetailScreen(uName: chat['name']),
                ),
              );
            },
            leading: Stack(
              children: [
                CircleAvatar(
                  radius: 28.r,
                  backgroundImage: NetworkImage(chat['image']),
                ),
                if (chat['unread'] > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 12.w,
                      height: 12.w,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 2)),
                      ),
                    ),
                  ),
              ],
            ),
            title: Text(
              chat['name'],
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16.sp,
                color: AppColors.textPrimary,
              ),
            ),
            subtitle: Text(
              chat['message'],
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: chat['unread'] > 0 ? AppColors.textPrimary : AppColors.textSecondary,
                fontWeight: chat['unread'] > 0 ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  chat['time'],
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: chat['unread'] > 0 ? AppColors.primary : AppColors.textSecondary,
                  ),
                ),
                if (chat['unread'] > 0) ...[
                  Gap(4.h),
                  Container(
                    padding: EdgeInsets.all(6.w),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${chat['unread']}',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
