import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';

class SubmitTaskStep3Screen extends StatelessWidget {
  const SubmitTaskStep3Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Submit Work', style: TextStyle(color: AppColors.textPrimary)),
        leading: const BackButton(color: AppColors.textPrimary),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          children: [
             _buildProgressIndicator(3),
            Gap(40.h),
             Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                color: Colors.green.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.task_alt,
                size: 64.w,
                color: Colors.green,
              ),
            ),
            Gap(24.h),
            Text(
              'Confirm Submission',
              style: TextStyle(
                fontSize: 24.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(12.h),
            Text(
              'Are you sure you want to submit this work? The requester will review it before releasing funds.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
            const Spacer(),
            PrimaryButton(
              text: 'Confirm & Submit',
              onPressed: () {
                 Navigator.popUntil(context, (route) => route.isFirst);
                 ScaffoldMessenger.of(context).showSnackBar(
                   const SnackBar(content: Text('Work Submitted Successfully!')),
                 );
              },
            ),
            Gap(20.h),
          ],
        ),
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
