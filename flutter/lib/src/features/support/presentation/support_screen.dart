import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Help & Support', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: SingleChildScrollView(
         padding: EdgeInsets.all(24.w),
         child: Column(
           crossAxisAlignment: CrossAxisAlignment.start,
           children: [
             Text(
               'How can we help you?',
               style: TextStyle(
                 fontSize: 22.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.textPrimary,
               ),
             ),
             Gap(24.h),
             _buildSupportOption(
               context,
               'Instructional Videos',
               'Watch tutorials on how to use BackLyst.',
               Icons.play_circle_outline,
               () {
                 // Navigate to Video Player
                 Navigator.push(
                   context,
                   MaterialPageRoute(builder: (context) => const InstructionalVideoScreen()),
                 );
               },
             ),
             Gap(16.h),
             _buildSupportOption(
               context,
               'Create Support Ticket',
               'Report an issue or ask a question.',
               Icons.confirmation_number_outlined,
               () {
                 // Navigate to Create Ticket
               },
             ),
             Gap(16.h),
             _buildSupportOption(
               context,
               'FAQs',
               'Find answers to common questions.',
               Icons.help_outline,
               () {},
             ),
             Gap(32.h),
             Text(
               'Recent Tickets',
               style: TextStyle(
                 fontSize: 18.sp,
                 fontWeight: FontWeight.bold,
                 color: AppColors.textPrimary,
               ),
             ),
             Gap(16.h),
             _buildTicketItem('Payment Issue', 'Open', '2 days ago'),
             _buildTicketItem('Verification Pending', 'Resolved', '1 week ago'),
           ],
         ),
      ),
    );
  }

  Widget _buildSupportOption(BuildContext context, String title, String subtitle, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
             BoxShadow(
               color: Colors.black.withOpacity(0.05),
               blurRadius: 10,
               offset: const Offset(0, 4),
             ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(12.w),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppColors.primary, size: 24.w),
            ),
            Gap(16.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text(
                     title,
                     style: TextStyle(
                       fontSize: 16.sp,
                       fontWeight: FontWeight.bold,
                       color: AppColors.textPrimary,
                     ),
                   ),
                   Text(
                     subtitle,
                     style: TextStyle(
                       fontSize: 12.sp,
                       color: AppColors.textSecondary,
                     ),
                   ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16.sp, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketItem(String title, String status, String time) {
    Color statusColor = status == 'Open' ? Colors.orange : Colors.green;
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12.r),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
           Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               Text(
                 title,
                 style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.sp),
               ),
               Text(
                 time,
                 style: TextStyle(color: AppColors.textSecondary, fontSize: 12.sp),
               ),
             ],
           ),
           Container(
             padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
             decoration: BoxDecoration(
               color: statusColor.withOpacity(0.1),
               borderRadius: BorderRadius.circular(8.r),
             ),
             child: Text(
               status,
               style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12.sp),
             ),
           ),
        ],
      ),
    );
  }
}

class InstructionalVideoScreen extends StatelessWidget {
  const InstructionalVideoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tutorials', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.play_circle_filled, size: 80.w, color: AppColors.primary),
            Gap(16.h),
            Text(
              'Video Player Placeholder',
              style: TextStyle(fontSize: 18.sp, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
