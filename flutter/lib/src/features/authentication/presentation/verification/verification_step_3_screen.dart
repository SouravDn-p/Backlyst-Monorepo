import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import '../../../dashboard/presentation/dashboard_screen.dart';

class VerificationStep3Screen extends StatelessWidget {
  const VerificationStep3Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.textPrimary),
        title: Text(
          'Verification Step 3',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 18.sp),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          children: [
             Gap(40.h),
            Container(
              padding: EdgeInsets.all(24.w),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle,
                size: 64.w,
                color: AppColors.primary,
              ),
            ),
            Gap(24.h),
            Text(
              'Verification Pending',
              style: TextStyle(
                fontSize: 24.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(12.h),
            Text(
              'We are verifying your website. This process usually takes a few minutes. You will receive a notification once completed.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.textSecondary,
              ),
            ),
            const Spacer(),
            PrimaryButton(
              text: 'Go to Dashboard',
              onPressed: () {
                // Navigate to Dashboard
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const DashboardScreen()),
                  (route) => false,
                );
              },
            ),
            Gap(20.h),
          ],
        ),
      ),
    );
  }
}
