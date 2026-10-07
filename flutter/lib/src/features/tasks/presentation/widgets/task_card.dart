import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';

enum TaskStatus { waiting, inProgress, completed }

class TaskCard extends StatelessWidget {
  final String title;
  final String website;
  final double price;
  final TaskStatus status;
  final VoidCallback onTap;

  const TaskCard({
    super.key,
    required this.title,
    required this.website,
    required this.price,
    required this.status,
    required this.onTap,
  });

  Color _getStatusColor() {
    switch (status) {
      case TaskStatus.waiting:
        return Colors.orange;
      case TaskStatus.inProgress:
        return Colors.blue;
      case TaskStatus.completed:
        return Colors.green;
    }
  }

  String _getStatusText() {
    switch (status) {
      case TaskStatus.waiting:
        return 'Waiting for Applicants';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.completed:
        return 'Completed';
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10), // Fixed withAlpha
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                  decoration: BoxDecoration(
                    color: _getStatusColor().withAlpha(25), // Fixed withAlpha
                    borderRadius: BorderRadius.circular(20.r),
                  ),
                  child: Text(
                    _getStatusText(),
                    style: TextStyle(
                      color: _getStatusColor(),
                      fontSize: 12.sp,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  '\$${price.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            Gap(12.h),
            Text(
              title,
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(4.h),
            Row(
              children: [
                Icon(Icons.link, size: 14.sp, color: AppColors.textSecondary),
                Gap(4.w),
                Text(
                  website,
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            Gap(16.h),
            Row(
              children: [
                _buildAvatarStack(),
                const Spacer(),
                Icon(Icons.arrow_forward_ios, size: 16.sp, color: AppColors.textSecondary),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarStack() {
    // Placeholder for overlapping avatars
    return SizedBox(
      width: 60.w,
      height: 24.h,
      child: Stack(
        children: [
          _buildCircleAvatar(0, Colors.red),
          Positioned(left: 15, child: _buildCircleAvatar(1, Colors.green)),
          Positioned(left: 30, child: _buildCircleAvatar(2, Colors.blue)),
        ],
      ),
    );
  }

  Widget _buildCircleAvatar(int index, Color color) {
    return Container(
      width: 24.w,
      height: 24.w,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
    );
  }
}
