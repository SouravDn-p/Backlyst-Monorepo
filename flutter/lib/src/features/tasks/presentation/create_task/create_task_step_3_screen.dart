import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class CreateTaskStep3Screen extends StatelessWidget {
  const CreateTaskStep3Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Task', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             _buildProgressIndicator(3),
            Gap(32.h),
            Text(
              'Review & Publish',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(24.h),
            _buildReviewItem('Title', 'Review Tech Product'),
            _buildReviewItem('Website', 'https://techreview.com'),
            _buildReviewItem('Budget', '\$250.00'),
            _buildReviewItem('Total Cost', '\$262.50'),
            
            Gap(32.h),
            Container(
              padding: EdgeInsets.all(16.w),
              decoration: BoxDecoration(
                color: Colors.amber.withAlpha(20),
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: Colors.amber.withAlpha(50)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.amber),
                  Gap(12.w),
                  Expanded(
                    child: Text(
                      'Funds will be held in escrow until you approve the work.',
                      style: TextStyle(fontSize: 12.sp, color: Colors.amber[900]),
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),
            PrimaryButton(
              text: 'Publish Task',
              onPressed: () {
                // Publish Logic
                Navigator.popUntil(context, (route) => route.isFirst);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Task Published Successfully!')),
                );
              },
            ),
            Gap(20.h),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 16.sp,
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

   // Helper method duplication for speed (should be refactored to component)
  Widget _buildProgressIndicator(int step) {
    return Row(
      children: [
        _buildStepDot(1, step >= 1),
        _buildStepLine(step >= 2),
        _buildStepDot(2, step >= 2),
        _buildStepLine(step >= 3),
        _buildStepDot(3, step >= 3),
      ],
    );
  }

  Widget _buildStepDot(int number, bool isActive) {
    return Container(
      width: 32.w,
      height: 32.w,
      decoration: BoxDecoration(
        color: isActive ? AppColors.primary : AppColors.surface,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        '$number',
        style: TextStyle(
          color: isActive ? Colors.white : AppColors.textSecondary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Expanded(
      child: Container(
        height: 2.h,
        color: isActive ? AppColors.primary : AppColors.surface,
      ),
    );
  }
}
