import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'submit_task_step_3_screen.dart';

class SubmitTaskStep2Screen extends StatelessWidget {
  const SubmitTaskStep2Screen({super.key});

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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildProgressIndicator(2),
            Gap(32.h),
            Text(
              'Upload Proofs',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
             Gap(8.h),
            Text(
              'Upload screenshots or documents (optional).',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            ),
            Gap(32.h),
            
            Container(
              width: double.infinity,
              height: 200.h,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(color: AppColors.border, style: BorderStyle.solid), // Should be dashed ideally
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_upload_outlined, size: 48.w, color: AppColors.primary),
                  Gap(16.h),
                  Text(
                    'Tap to upload files',
                    style: TextStyle(
                      fontSize: 16.sp,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(),
            PrimaryButton(
              text: 'Next: Review',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SubmitTaskStep3Screen()),
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
