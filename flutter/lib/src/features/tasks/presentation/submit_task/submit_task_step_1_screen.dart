import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'submit_task_step_2_screen.dart';

class SubmitTaskStep1Screen extends StatelessWidget {
  const SubmitTaskStep1Screen({super.key});

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
            _buildProgressIndicator(1),
            Gap(32.h),
            Text(
              'Work Links',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(8.h),
            Text(
              'Please provide the URL where the task was completed.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            ),
            Gap(24.h),
            const CustomTextField(
              hintText: 'https://example.com/post/123',
              prefixIcon: Icons.link,
            ),
            Gap(24.h),
            Text(
              'Comments',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(12.h),
            Container(
              height: 120.h,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16.r),
              ),
              child: TextField(
                 maxLines: 5,
                 decoration: InputDecoration(
                   hintText: 'Any additional notes for the requester...',
                   hintStyle: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
                   border: InputBorder.none,
                   contentPadding: EdgeInsets.all(20.w),
                 ),
              ),
            ),
            const Spacer(),
            PrimaryButton(
              text: 'Next: Upload Proofs',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SubmitTaskStep2Screen()),
                );
              },
            ),
            Gap(20.h),
          ],
        ),
      ),
    );
  }

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
