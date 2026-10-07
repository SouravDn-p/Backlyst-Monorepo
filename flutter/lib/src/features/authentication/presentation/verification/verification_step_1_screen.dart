import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:backlyst_mobile/src/core/theme/app_colors.dart';
import 'package:backlyst_mobile/src/common_widgets/custom_text_field.dart';
import 'package:backlyst_mobile/src/common_widgets/primary_button.dart';
import 'verification_step_2_screen.dart';

class VerificationStep1Screen extends StatelessWidget {
  const VerificationStep1Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.textPrimary),
        title: Text(
          'Verification Step 1',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 18.sp),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter Website URL',
              style: TextStyle(
                fontSize: 22.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(12.h),
            Text(
              'Please provide the URL of the website you want to verify.',
              style: TextStyle(fontSize: 14.sp, color: AppColors.textSecondary),
            ),
            Gap(32.h),
            const CustomTextField(
              hintText: 'https://example.com',
              prefixIcon: Icons.language,
            ),
            const Spacer(),
            PrimaryButton(
              text: 'Continue',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const VerificationStep2Screen(),
                  ),
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
