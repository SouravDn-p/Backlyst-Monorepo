import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'create_task_step_3_screen.dart';

class CreateTaskStep2Screen extends StatelessWidget {
  const CreateTaskStep2Screen({super.key});

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
             _buildProgressIndicator(2),
            Gap(32.h),
            Text(
              'Budget & Pricing',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(24.h),
            const CustomTextField(
              hintText: '0.00',
              prefixIcon: Icons.attach_money,
            ),
            Gap(16.h),
            Text(
              'Platform Fee (5%)',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14.sp),
            ),
            Gap(4.h),
            Text(
              '\$12.50', // Placeholder calculation
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
              ),
            ),
             Gap(32.h),
             Container(
               padding: EdgeInsets.all(16.w),
               decoration: BoxDecoration(
                 color: AppColors.primary.withAlpha(20),
                 borderRadius: BorderRadius.circular(12.r),
               ),
               child: Row(
                 mainAxisAlignment: MainAxisAlignment.spaceBetween,
                 children: [
                   Text(
                     'Total Payable',
                     style: TextStyle(
                       fontWeight: FontWeight.bold,
                       color: AppColors.primary,
                       fontSize: 16.sp,
                     ),
                   ),
                   Text(
                     '\$262.50',
                     style: TextStyle(
                       fontWeight: FontWeight.bold,
                       color: AppColors.primary,
                       fontSize: 20.sp,
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
                  MaterialPageRoute(builder: (context) => const CreateTaskStep3Screen()),
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
