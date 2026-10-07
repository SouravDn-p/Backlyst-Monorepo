import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'widgets/task_card.dart'; // Reuse TaskStatus enum

class TaskDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> task;
  final TaskStatus status;

  const TaskDetailsScreen({
    super.key,
    required this.task,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.textPrimary),
        title: Text(
          'Task Details',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 18.sp),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_horiz, color: AppColors.textPrimary),
            onPressed: () {
              // Show options menu
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusBadge(),
            Gap(20.h),
            Text(
              task['title'] ?? 'Task Title',
              style: TextStyle(
                fontSize: 24.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(8.h),
            Row(
              children: [
                Icon(Icons.link, size: 16.sp, color: AppColors.primary),
                Gap(8.w),
                Text(
                  task['website'] ?? 'https://example.com',
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.primary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ],
            ),
            Gap(24.h),
            _buildPriceSection(),
            Gap(32.h),
            Text(
              'Description',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(12.h),
            Text(
              'This is a placeholder description for the task. It would contain details about what needs to be done, requirements, and any specific instructions from the requester.',
              style: TextStyle(
                fontSize: 14.sp,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            Gap(40.h),
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color color;
    String text;
    switch (status) {
      case TaskStatus.waiting:
        color = Colors.orange;
        text = 'Waiting for Applicants';
        break;
      case TaskStatus.inProgress:
        color = Colors.blue;
        text = 'In Progress';
        break;
      case TaskStatus.completed:
        color = Colors.green;
        text = 'Completed';
        break;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(20.r),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 14.sp,
        ),
      ),
    );
  }

  Widget _buildPriceSection() {
    return Container(
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16.r),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Total Budget',
                style: TextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
              ),
              Gap(4.h),
              Text(
                '\$${task['price']?.toStringAsFixed(2) ?? '0.00'}',
                style: TextStyle(
                  fontSize: 24.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          Container(
            padding: EdgeInsets.all(12.w),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.wallet, color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    if (status == TaskStatus.waiting) {
      return PrimaryButton(
        text: 'Edit Task',
        onPressed: () {},
      );
    } else if (status == TaskStatus.inProgress) {
      return Column(
        children: [
          PrimaryButton(
            text: 'Approve & Release Funds',
            onPressed: () {
              // Navigate to Release Funds Screen
            },
          ),
          Gap(16.h),
          SizedBox(
            width: double.infinity,
            height: 56.h,
            child: OutlinedButton(
               onPressed: () {
                 // Request Revision
               },
               style: OutlinedButton.styleFrom(
                 side: const BorderSide(color: AppColors.primary),
                 shape: RoundedRectangleBorder(
                   borderRadius: BorderRadius.circular(16.r),
                 ),
               ),
               child: Text(
                 'Request Revision',
                 style: TextStyle(
                   fontSize: 16.sp,
                   fontWeight: FontWeight.w600,
                   color: AppColors.primary,
                 ),
               ),
            ),
          ),
        ],
      );
    }
    return const SizedBox.shrink(); // No actions for completed
  }
}
